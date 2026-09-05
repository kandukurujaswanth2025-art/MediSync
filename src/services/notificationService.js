import API_URL from "@/api/config";

let notificationCache = null;
let notificationCacheTime = 0;
let notificationRequest = null;

const CACHE_TIME = 5000;

function getSession() {
  const session = localStorage.getItem("medisync_session");
  return session ? JSON.parse(session) : null;
}

function getToken() {
  const session = getSession();

  if (!session?.token) {
    throw new Error("Authentication required. Please login again.");
  }

  return session.token;
}

async function apiRequest(url, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function getNotificationsOnce() {
  const now = Date.now();

  if (
    notificationCache &&
    now - notificationCacheTime < CACHE_TIME
  ) {
    return notificationCache;
  }

  if (notificationRequest) {
    return notificationRequest;
  }

  notificationRequest = apiRequest("/notifications")
    .then((data) => {
      notificationCache = data;
      notificationCacheTime = Date.now();
      return data;
    })
    .finally(() => {
      notificationRequest = null;
    });

  return notificationRequest;
}

function clearNotificationCache() {
  notificationCache = null;
  notificationCacheTime = 0;
}

// Create notification
export async function notify({
  hospitalId,
  scope,
  targetId,
  title,
  message,
}) {
  return null;
}

// Get notifications
export async function listNotifications(
  hospitalId,
  scope,
  targetId
) {
  const data = await getNotificationsOnce();

  return data
    .filter((notification) => {
      if (scope && notification.scope !== scope) {
        return false;
      }

      if (
        targetId != null &&
        notification.target_id !== targetId &&
        notification.target_id !== null
      ) {
        return false;
      }

      return true;
    })
    .map(normalizeNotification);
}

// Mark one notification as read
export async function markRead(id) {
  const data = await apiRequest(
    `/notifications/${id}/read`,
    {
      method: "PATCH",
    }
  );

  clearNotificationCache();

  return normalizeNotification(data);
}

// Mark all notifications as read
export async function markAllRead(
  hospitalId,
  scope,
  targetId
) {
  const notifications = await listNotifications(
    hospitalId,
    scope,
    targetId
  );

  const unread = notifications.filter(
    (notification) => !notification.read
  );

  await Promise.all(
    unread.map((notification) =>
      markRead(notification.id)
    )
  );

  clearNotificationCache();

  return true;
}

// Get unread count
export async function unreadCount(
  hospitalId,
  scope,
  targetId
) {
  const notifications = await listNotifications(
    hospitalId,
    scope,
    targetId
  );

  return notifications.filter(
    (notification) => !notification.read
  ).length;
}

// Convert PostgreSQL fields to frontend fields
function normalizeNotification(notification) {
  return {
    id: notification.id,
    hospitalId: notification.hospital_id,
    scope: notification.scope,
    targetId: notification.target_id,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    createdAt: notification.created_at,
  };
}