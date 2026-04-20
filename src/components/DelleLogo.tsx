import { motion } from "framer-motion";
import logoImage from "@/assets/logo-new.png";

const DelleLogo = ({ size = 32, showText = true, footerLogo = false }: {size?: number;showText?: boolean; footerLogo?: boolean;}) => {
  const currentLogo = footerLogo ? "/src/assets/logo-footer.png" : logoImage;
  
  return (
    <div className="flex items-center gap-2.5 bg-[#070808]/[0.01]">
      <motion.div
        className="relative flex items-center justify-center overflow-hidden rounded-xl"
        style={{ width: size, height: size }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}>
        
        <img
          src={currentLogo}
          alt="Delle Logo"
          className="w-full h-full object-cover pl-0 pt-0 py-[10px] pb-0 pr-0 ml-0 bg-black/[0.01] mr-0 mt-[4px] text-6xl rounded-full" />
        
      </motion.div>
      {showText &&
      <span className="font-display font-bold tracking-tight mr-[30px] rounded-lg shadow text-white" style={{ fontSize: size * 0.65 }}>
          Delle  
        </span>
      }
    </div>);
};

export default DelleLogo;