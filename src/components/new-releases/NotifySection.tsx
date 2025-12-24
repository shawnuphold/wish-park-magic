import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

const categories = [
  { id: 'loungefly', label: 'Loungefly' },
  { id: 'spirit-jerseys', label: 'Spirit Jerseys' },
  { id: 'popcorn-buckets', label: 'Popcorn Buckets' },
  { id: 'ears', label: 'Ears' },
  { id: 'pins', label: 'Pins' },
  { id: 'villains', label: 'Villains Collection' },
  { id: 'limited-edition', label: 'Limited Edition' },
  { id: 'holiday', label: 'Holiday Items' },
];

const emailSchema = z.string().trim().email('Please enter a valid email');

export function NotifySection() {
  const [email, setEmail] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setIsSubmitting(true);

    // Simulate form submission (frontend-only)
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSuccess(true);
    setEmail('');
    setSelectedCategories([]);
    setIsSubmitting(false);
  };

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(260, 40%, 96%) 50%, hsl(var(--background)) 100%)'
        }}
      />
      
      {/* Subtle Pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container-wide relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-gold/10 text-gold px-4 py-2 rounded-full mb-4">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Stay Updated</span>
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            Never Miss a Drop
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Tell us what you're looking for and we'll alert you when it's spotted
          </p>
        </motion.div>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-card rounded-xl p-6 shadow-card text-center"
          >
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">
              You're All Set!
            </h3>
            <p className="text-muted-foreground mb-4">
              We'll send you updates when new items in your categories are spotted.
            </p>
            <Button variant="outline" onClick={() => setIsSuccess(false)}>
              Subscribe to More
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Categories */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl p-6 shadow-card"
              >
                <h3 className="font-heading font-semibold text-foreground mb-4">
                  Select Categories
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.id}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <Label 
                        htmlFor={category.id} 
                        className="text-sm cursor-pointer"
                      >
                        {category.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Email Input */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl p-6 shadow-card flex flex-col justify-center"
              >
                <h3 className="font-heading font-semibold text-foreground mb-4">
                  Get Notified
                </h3>
                <div className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className={error ? 'border-destructive' : ''}
                    />
                    {error && (
                      <p className="text-destructive text-xs mt-1">{error}</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    variant="gold" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subscribing...
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Notify Me
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
