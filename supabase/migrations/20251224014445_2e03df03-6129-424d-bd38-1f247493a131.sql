-- Create new_releases table for merchandise
CREATE TABLE public.new_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  park TEXT NOT NULL CHECK (park IN ('disney', 'universal', 'seaworld')),
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source TEXT NOT NULL,
  price_estimate DECIMAL(10,2),
  release_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_limited_edition BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  location_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.new_releases ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (merchandise info is public)
CREATE POLICY "Anyone can view active releases" 
ON public.new_releases 
FOR SELECT 
USING (status = 'active');

-- Create notification_subscriptions table
CREATE TABLE public.notification_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting subscriptions (anyone can subscribe)
CREATE POLICY "Anyone can subscribe to notifications" 
ON public.notification_subscriptions 
FOR INSERT 
WITH CHECK (true);

-- Create contact_submissions table for product requests
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'general',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  product_id UUID REFERENCES public.new_releases(id),
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  notify_similar BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting submissions (anyone can submit)
CREATE POLICY "Anyone can submit contact requests" 
ON public.contact_submissions 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_new_releases_updated_at
BEFORE UPDATE ON public.new_releases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.new_releases (title, description, park, category, image_url, source_url, source, price_estimate, is_limited_edition, release_date) VALUES
('Haunted Mansion Loungefly Mini Backpack', 'Spooky and stylish backpack featuring the iconic Haunted Mansion wallpaper pattern', 'disney', 'loungefly', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', 'https://blogmickey.com', 'BlogMickey', 89.99, false, now() - interval '1 day'),
('Figment Popcorn Bucket - EPCOT Festival', 'The highly sought-after Figment popcorn bucket from EPCOT Festival of the Arts', 'disney', 'popcorn-buckets', 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400&h=400&fit=crop', 'https://wdwnt.com', 'WDW News Today', 29.99, true, now() - interval '2 days'),
('Universal Studios Horror Nights Spirit Jersey', 'Limited edition spirit jersey celebrating Halloween Horror Nights', 'universal', 'spirit-jerseys', 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop', 'https://orlandounited.com', 'Orlando United', 74.99, false, now() - interval '1 day'),
('Mickey Mouse 50th Anniversary Ears', 'Commemorative ears celebrating 50 years of Walt Disney World', 'disney', 'ears', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop', 'https://blogmickey.com', 'BlogMickey', 39.99, true, now() - interval '5 days'),
('SeaWorld Orca Encounter Pin Set', 'Collectible pin set featuring the beloved Orca Encounter show', 'seaworld', 'pins', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop', 'https://themeparkinsider.com', 'Theme Park Insider', 24.99, false, now() - interval '2 days'),
('Jurassic World Limited Edition Backpack', 'Exclusive Loungefly backpack with Jurassic World dinosaur design', 'universal', 'loungefly', 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=400&h=400&fit=crop', 'https://orlandoparkstop.com', 'Orlando ParkStop', 95.00, true, now() - interval '4 days'),
('Main Street USA Retro Spirit Jersey', 'Vintage-inspired spirit jersey with classic Main Street USA design', 'disney', 'spirit-jerseys', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop', 'https://chipandco.com', 'Chip and Co', 69.99, false, now() - interval '1 day'),
('Butterbeer Popcorn Bucket', 'Wizarding World exclusive Butterbeer mug popcorn bucket', 'universal', 'popcorn-buckets', 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400&h=400&fit=crop', 'https://universalparksblog.com', 'Universal Parks Blog', 35.00, true, now() - interval '1 day');