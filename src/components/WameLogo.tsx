import { motion } from "framer-motion";
import wameLogoImage from "@/assets/doka-logo.png";

const WameLogo = ({ size = 32, showText = true }: { size?: number; showText?: boolean }) => {
  return (
    <div className="flex items-center gap-2.5">
      <motion.div
        className="relative flex items-center justify-center overflow-hidden rounded-xl"
        style={{ width: size, height: size }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <img 
          src={wameLogoImage} 
          alt="Wame Logo" 
          className="w-full h-full object-cover"
        />
      </motion.div>
      {showText && (
        <span className="font-display font-bold text-foreground tracking-tight" style={{ fontSize: size * 0.65 }}>
          Wame
        </span>
      )}
    </div>
  );
};

export default WameLogo;
