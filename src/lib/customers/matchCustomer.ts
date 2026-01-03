/**
 * Customer Matching for Telegram Bot
 *
 * Matches Facebook names from screenshots to existing customers.
 * Handles aliases, fuzzy matching, and real name = FB name cases.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

interface CustomerData {
  id: string;
  name: string;
  email: string | null;
  facebook_name: string | null;
  phone: string | null;
}

interface MatchResult {
  found: boolean;
  customer?: CustomerData;
  matchedOn?: 'facebook_alias' | 'facebook_name' | 'real_name' | 'partial';
  suggestions?: Array<{
    id: string;
    name: string;
    email: string | null;
    facebook_name: string | null;
    matchType: string;
  }>;
}

/**
 * Match a customer by their Facebook name
 *
 * Search order:
 * 1. Exact match in customer_aliases (type='facebook')
 * 2. Exact match on customers.facebook_name
 * 3. Exact match on customers.name (real name = FB name case)
 * 4. Partial/fuzzy match on all three fields
 */
export async function matchCustomerByFBName(fbName: string): Promise<MatchResult> {
  const supabase = getSupabaseAdmin();
  const normalized = fbName.toLowerCase().trim();

  // Check 1: Exact match in customer_aliases
  const { data: aliasMatch } = await supabase
    .from('customer_aliases')
    .select(`
      customer_id,
      customers (
        id,
        name,
        email,
        facebook_name,
        phone
      )
    `)
    .eq('alias_type', 'facebook')
    .ilike('alias_value', normalized)
    .limit(1)
    .single();

  if (aliasMatch?.customers) {
    const customer = aliasMatch.customers as unknown as CustomerData;
    return {
      found: true,
      customer,
      matchedOn: 'facebook_alias'
    };
  }

  // Check 2: Exact match on facebook_name column
  const { data: fbMatch } = await supabase
    .from('customers')
    .select('id, name, email, facebook_name, phone')
    .ilike('facebook_name', normalized)
    .limit(1)
    .single();

  if (fbMatch) {
    return {
      found: true,
      customer: fbMatch as CustomerData,
      matchedOn: 'facebook_name'
    };
  }

  // Check 3: Exact match on real name (FB name = real name case)
  const { data: nameMatch } = await supabase
    .from('customers')
    .select('id, name, email, facebook_name, phone')
    .ilike('name', normalized)
    .limit(1)
    .single();

  if (nameMatch) {
    return {
      found: true,
      customer: nameMatch as CustomerData,
      matchedOn: 'real_name'
    };
  }

  // Check 4: Partial matches across all fields
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('id, name, email, facebook_name');

  const suggestions: MatchResult['suggestions'] = [];

  if (allCustomers) {
    for (const c of allCustomers) {
      const realName = c.name?.toLowerCase() || '';
      const fbNameField = c.facebook_name?.toLowerCase() || '';

      let matchType = '';

      // Check various partial match conditions
      if (realName.includes(normalized) || normalized.includes(realName)) {
        matchType = 'partial_name';
      } else if (fbNameField.includes(normalized) || normalized.includes(fbNameField)) {
        matchType = 'partial_facebook';
      } else {
        // Check if first/last names match
        const searchParts = normalized.split(/\s+/);
        const nameParts = realName.split(/\s+/);

        const hasMatchingPart = searchParts.some(sp =>
          nameParts.some(np => np === sp || np.includes(sp) || sp.includes(np))
        );

        if (hasMatchingPart) {
          matchType = 'partial_word';
        }
      }

      if (matchType) {
        suggestions.push({
          id: c.id,
          name: c.name,
          email: c.email,
          facebook_name: c.facebook_name,
          matchType
        });
      }
    }
  }

  // Sort by match quality and limit
  const sortedSuggestions = suggestions
    .sort((a, b) => {
      const priority: Record<string, number> = {
        'partial_name': 1,
        'partial_facebook': 2,
        'partial_word': 3
      };
      return (priority[a.matchType] || 99) - (priority[b.matchType] || 99);
    })
    .slice(0, 5);

  return {
    found: false,
    suggestions: sortedSuggestions
  };
}

/**
 * Add a customer alias
 */
export async function addCustomerAlias(
  customerId: string,
  aliasType: 'facebook' | 'instagram' | 'telegram' | 'email' | 'phone' | 'other',
  aliasValue: string,
  isPrimary: boolean = false
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('customer_aliases')
    .insert({
      customer_id: customerId,
      alias_type: aliasType,
      alias_value: aliasValue.toLowerCase().trim(),
      is_primary: isPrimary
    });

  // Ignore unique constraint violations (alias already exists)
  if (error && !error.message.includes('duplicate')) {
    console.error('Error adding customer alias:', error);
    return false;
  }

  return true;
}

/**
 * Get all aliases for a customer
 */
export async function getCustomerAliases(customerId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('customer_aliases')
    .select('*')
    .eq('customer_id', customerId)
    .order('alias_type')
    .order('is_primary', { ascending: false });

  if (error) {
    console.error('Error fetching customer aliases:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a new customer from Facebook info and add alias
 */
export async function createCustomerFromFacebook(
  fbName: string,
  email?: string | null,
  fbProfileUrl?: string | null
): Promise<CustomerData | null> {
  const supabase = getSupabaseAdmin();

  // Generate placeholder email if none provided (database requires NOT NULL)
  const customerEmail = email || `fb.${Date.now()}@placeholder.local`;

  // Create customer with FB name as both name and facebook_name
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({
      name: fbName.trim(),
      email: customerEmail,
      facebook_name: fbName.trim(),
      facebook_profile_url: fbProfileUrl || null,
      country: 'US' // Default
    })
    .select('id, name, email, facebook_name, phone')
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    return null;
  }

  // Also add the FB name as an alias for future matching
  if (newCustomer) {
    await addCustomerAlias(newCustomer.id, 'facebook', fbName, true);
  }

  return newCustomer as CustomerData;
}

/**
 * Link an existing customer to a Facebook name
 */
export async function linkCustomerToFacebook(
  customerId: string,
  fbName: string,
  fbProfileUrl?: string | null
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Update customer's facebook_name if not set
  const { error: updateError } = await supabase
    .from('customers')
    .update({
      facebook_name: fbName.trim(),
      ...(fbProfileUrl && { facebook_profile_url: fbProfileUrl })
    })
    .eq('id', customerId)
    .is('facebook_name', null); // Only update if not already set

  if (updateError) {
    console.error('Error updating customer facebook_name:', updateError);
  }

  // Add as alias regardless
  return addCustomerAlias(customerId, 'facebook', fbName, false);
}
