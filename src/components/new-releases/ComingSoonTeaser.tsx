import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';

export function ComingSoonTeaser() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="relative overflow-hidden bg-gradient-to-r from-midnight to-midnight-light rounded-2xl p-6 md:p-8 my-8"
    >
      {/* Background sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-gold/30"
            animate={{ 
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
        <div className="w-14 h-14 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Calendar className="w-7 h-7 text-gold" />
        </div>
        
        <div>
          <div className="inline-flex items-center gap-2 bg-gold/20 text-gold px-3 py-1 rounded-full text-xs font-medium mb-2">
            <Sparkles className="w-3 h-3" />
            Coming Soon
          </div>
          <h3 className="font-heading text-xl md:text-2xl font-bold text-white mb-1">
            Release Calendar
          </h3>
          <p className="text-white/70 text-sm md:text-base">
            Know what's dropping before it hits the parks. Stay ahead of the crowd!
          </p>
        </div>
      </div>
    </motion.div>
  );
}
