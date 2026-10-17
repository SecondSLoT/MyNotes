/* Настройки Android-шпаргалки.
   1) firebase — скопируй сюда объект firebaseConfig из консоли Firebase:
      Project settings → General → Your apps → Web app → SDK setup and configuration → Config.
   2) allowedEmails — Google-аккаунты, которым можно открывать заметки.
      Та же почта должна стоять в правилах Firestore (файл firestore.rules). */
window.NOTES_CONFIG = {
  firebase: {
    apiKey: "AIzaSyDf3wkKQVdxGcFhx3HTraCDV2xyfw8cnX4",
    authDomain: "android-notes-fbca7.firebaseapp.com",
    projectId: "android-notes-fbca7",
    storageBucket: "android-notes-fbca7.firebasestorage.app",
    messagingSenderId: "933610625849",
    appId: "1:933610625849:web:ba35446e9dc2d3102ee6e8"
  },
  allowedEmails: ["secondslot@gmail.com"]
};
