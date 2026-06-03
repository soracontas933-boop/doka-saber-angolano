import { useNavigate } from "react-router-dom";
import { X, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupportNotifications } from "@/hooks/useSupportNotifications";

const SupportNotification = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead } = useSupportNotifications();

  // Handle notification click
  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
    // Navigate to support chat
    navigate("/suporte");
  };

  // Close notification
  const handleClose = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(notificationId);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -100, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -100, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="pointer-events-auto mx-4 mt-4"
            style={{
              maxWidth: "calc(100% - 32px)",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <div
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg shadow-lg p-4 flex items-start gap-3 border border-primary/20 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => handleNotificationClick(notification.id)}
            >
              <div className="flex-shrink-0 mt-0.5">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Mensagem de Suporte</p>
                <p className="text-sm opacity-90 line-clamp-2 mt-1">
                  {notification.content}
                </p>
              </div>
              <button
                onClick={(e) => handleClose(notification.id, e)}
                className="flex-shrink-0 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default SupportNotification;
