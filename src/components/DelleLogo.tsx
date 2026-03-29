import { motion } from "framer-motion";
import logoImage from "@/assets/doka-logo.png";

const DelleLogo = ({ size = 32, showText = true }: {size?: number;showText?: boolean;}) => {
  return (
    <div className="flex items-center gap-2.5 bg-[#070808]/[0.01]">
      <motion.div
        className="relative flex items-center justify-center overflow-hidden rounded-xl"
        style={{ width: size, height: size }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}>
        
        <img
          src={logoImage}
          alt="Delle Logo"
          className="w-full h-full object-cover pl-0 pt-0 py-[10px] pb-0 pr-0 ml-0 mr-[10px] bg-black/[0.01]" />
        
      </motion.div>
      {showText &&
      <span className="font-display font-bold tracking-tight mr-[30px] rounded-lg shadow text-foreground" style={{ fontSize: size * 0.65 }}>
          Delle  
        </span>
      }
    </div>);
};

export default DelleLogo;