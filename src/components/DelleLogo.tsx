import { motion } from "framer-motion";
import logoImage from "@/assets/delle-logo.png";

const DelleLogo = ({ size = 32, showText = true, className = "" }: { size?: number; showText?: boolean; className?: string }) => {
  return (
    <div className={`flex items-center gap-2.5 bg-[#070808]/[0.01] ${className}`}>
      <motion.div
        className="relative flex items-center justify-center overflow-hidden rounded-xl"
        style={{ width: size, height: size }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}>
        
        <img
          src={logoImage}
          alt="Delle Logo"
          className="w-full h-full object-cover pb-0 pr-0 mr-[10px] bg-black/[0.01] pl-[10px] pt-[7px] ml-0 text-4xl py-[70px]" />
        
      </motion.div>
      {showText &&
      <span className="font-display font-bold tracking-tight mr-[30px] rounded-lg shadow text-foreground" style={{ fontSize: size * 0.65 }}>
          Delle  
        </span>
      }
    </div>);
};

export default DelleLogo;