importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyBW-Acv-UjsM1CjA1jNje0EdByhSciFkko",
  authDomain: "algopilot-3940a.firebaseapp.com",
  projectId: "algopilot-3940a",
  storageBucket: "algopilot-3940a.firebasestorage.app",
  messagingSenderId: "902062891754",
  appId: "1:902062891754:web:9f13ea21a8f11899fd6d93"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/favicon.ico"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
