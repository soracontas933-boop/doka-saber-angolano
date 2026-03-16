import { motion } from "framer-motion";

const DokaLogo = ({ size = 32, showText = true }: { size?: number; showText?: boolean }) => {
  return (
    <div className="flex items-center gap-2.5">
      <motion.div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary"
        style={{ width: size, height: size }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <span
          className="font-display font-extrabold text-secondary-foreground leading-none"
          style={{ fontSize: size * 0.55 }}
        >
          D
        </span>
      </motion.div>
      {showText && (
        <span className="font-display font-bold text-foreground tracking-tight" style={{ fontSize: size * 0.65 }}>
          DOKA
        </span>
      )}
    </div>
  );
};

export default DokaLogo;
