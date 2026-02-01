import { motion } from 'framer-motion';

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] w-full">
      <motion.div 
        className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
