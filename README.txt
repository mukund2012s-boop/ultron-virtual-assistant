ULTRON — VERCEL READY

PROJECT NAME
ultron-virtual-assistant

LOCAL DEVELOPMENT
1. npm install
2. Create .env from .env.example and add your Gemini API key.
3. npm start
4. Open http://localhost:3000

VERCEL DEPLOYMENT
1. Push this project to GitHub, or import the project folder into Vercel.
2. Create a Vercel project named ultron-virtual-assistant.
3. Add Environment Variables:
   GEMINI_API_KEY = your Gemini API key
   GEMINI_MODEL = gemini-3.6-flash
4. Deploy.
5. Test:
   https://YOUR-PROJECT.vercel.app/api/health

IMPORTANT
- The Gemini key is used only by /api/chat and is not placed in frontend code.
- Firebase Authentication and Firestore continue to run from the browser.
- Important Events memory is stored in Firestore under the signed-in user's account.
- Persistent chat history is NOT stored.
- Attachments use IndexedDB in the browser. They are not uploaded to Firebase Storage and do not require the Blaze plan.
- Local attachments are available only in the same browser/device profile where they were saved.
- Firebase Storage rules are not required for this version.
- Before production, publish the included firestore.rules to Firestore.
- In Firebase Authentication, add the deployed .vercel.app domain to Authorized domains if Firebase asks for it.
