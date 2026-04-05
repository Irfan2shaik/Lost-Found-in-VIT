# Firebase Setup Guide for VIT Lost & Found Portal

You must configure Firebase in your Google Cloud / Firebase console before this application interacts correctly.

## 1. Firebase Initialization
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Inside your project, add a **Web App** (the `</>` icon).
3. Register the app. Firebase will provide you with a `firebaseConfig` object containing your `apiKey`, `authDomain`, `projectId`, etc.
4. Open the `script.js` file in your workspace.
5. Search for `// TODO: Replace with your actual Firebase project configuration` at the top of the file.
6. Paste your new configuration values into the `firebaseConfig` variable.

## 2. Authentication Setup
1. In the Firebase Console, navigate to **Build** -> **Authentication**.
2. Click **Get Started**, then go to the **Sign-in method** tab.
3. Enable **Email/Password** provider (do NOT enable "Email link (passwordless)").
4. Save the configuration.

## 3. Cloud Firestore Setup & Security Rules
1. Navigate to **Build** -> **Firestore Database** and create a database (choose the region closest to you in production, e.g., `asia-south1`).
2. Start in **Production mode**.
3. Go to the **Rules** tab and paste the following security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{item} {
      // Anyone can read items
      allow read: if true;
      
      // Only authenticated users with @vitstudent.ac.in emails can create items
      allow create: if request.auth != null && 
        request.auth.token.email.matches('.*@vitstudent\\.ac\\.in$');
        
      // Only the user who created the item can update/delete it
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.user_id;
    }
  }
}
```

## 4. Firebase Storage Setup & Security Rules
1. Navigate to **Build** -> **Storage** and click **Get Started**.
2. Start in Production mode.
3. Go to the **Rules** tab and paste these security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{imageId} {
      // Anyone can read images
      allow read: if true;
      
      // Only auth users with vit accounts can upload images
      // Max image size limited to ~5MB
      allow write: if request.auth != null 
        && request.auth.token.email.matches('.*@vitstudent\\.ac\\.in$')
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 5. Deployment Options

### Using Firebase Hosting (Recommended)
1. Install the Firebase CLI: `npm install -g firebase-tools`
2. Login to your CLI: `firebase login`
3. Initialize hosting in your current project folder: `firebase init hosting`
   - Select your project
   - Type "public" as your directory (you will need to move `index.html`, `script.js`, and `styles.css` into a newly created `public` folder first).
   - Configure as a single page app? **No**
   - Set up automatic builds and deploys with Github? **No**
4. Deploy the site: `firebase deploy`

Your website will be live on `https://<YOUR_PROJECT_ID>.web.app`.
