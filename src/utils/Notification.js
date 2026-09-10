export const isNotificationSupported = () => {
  return typeof window !== "undefined" && "Notification" in window;
};

export const requestNotificationPermission = () => {
  if (!isNotificationSupported()) {
    return;
  }
  if (
    Notification.permission === "default"
  ) {
    Notification.requestPermission();
  }
};

export const showMessageNotification = ({ title, body, onClick }) => {
  if (!isNotificationSupported()) {
    return null;
  }
  if (Notification.permission !== "granted") {
    return null;
  }
  const notification = new Notification(title, {
    body,
    icon: "/favicon.ico",
  });
  notification.onclick = () => {
    window.focus();
    if (onClick) {
      onClick();
    }
    notification.close();
  };
  return notification;
};