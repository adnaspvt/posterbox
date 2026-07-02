#!/usr/bin/env node

/**
 * Firebase Collections Setup Guide for PosterBox
 * 
 * Run this after deploying the app to set up the necessary collections
 * and add sample data for marketing features.
 * 
 * Collections to Create:
 */

// 1. testimonials
// {
//   "id": "auto",
//   "name": "Priya Sharma",
//   "role": "Political Campaign Manager",
//   "image": "https://...",
//   "text": "PosterBox helped us reach 500K+ voters in just 2 weeks. The viral mechanics are insane!",
//   "metrics": "500K+ Reach",
//   "approved": true,
//   "createdAt": timestamp,
//   "rating": 5
// }

// 2. leads
// {
//   "id": "auto",
//   "email": "user@example.com",
//   "phone": "919876543210",
//   "source": "homepage_lead_capture",
//   "status": "new",
//   "createdAt": timestamp,
//   "converted": false,
//   "notes": ""
// }

// 3. referralPrograms (for user earnings)
// {
//   "id": "auto",
//   "userId": "auth_uid",
//   "referralCode": "POSTERBOX_ABC123",
//   "totalEarnings": 0,
//   "totalReferrals": 0,
//   "monthlyEarnings": 0,
//   "tier": "bronze",
//   "createdAt": timestamp,
//   "paymentMethod": "bank/wallet",
//   "lastPayout": timestamp
// }

// 4. referralHistory
// {
//   "id": "auto",
//   "referrerId": "auth_uid",
//   "referredUserId": "new_user_uid",
//   "referralCode": "POSTERBOX_ABC123",
//   "commission": 150,
//   "status": "completed",
//   "createdAt": timestamp,
//   "conversions": [
//     {
//       "date": timestamp,
//       "amount": 150,
//       "type": "template_purchase"
//     }
//   ]
// }

// 5. graphicDesigners (enhanced)
// {
//   "id": "auto",
//   "name": "Designer Name",
//   "email": "designer@example.com",
//   "phone": "919876543210",
//   "specialty": "Graphic Design",
//   "portfolio": ["template_id_1", "template_id_2"],
//   "rating": 4.8,
//   "reviews": 45,
//   "status": "active",
//   "earnings": 5000,
//   "templates": 12,
//   "verified": true,
//   "createdAt": timestamp,
//   "bio": "Professional graphic designer...",
//   "socialLinks": {
//     "instagram": "@designer",
//     "behance": "..."
//   }
// }

/**
 * Firestore Security Rules for Marketing Collections
 * 
 * Add these rules to your Firestore security rules:
 */

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Testimonials - Public read, Admin write only
    match /testimonials/{document=**} {
      allow read: if true;
      allow create, update, delete: if request.auth.uid == "YOUR_ADMIN_UID";
    }
    
    // Leads - Public create, Admin read/write
    match /leads/{document=**} {
      allow create: if request.auth == null;
      allow read, update, delete: if request.auth.uid == "YOUR_ADMIN_UID";
    }
    
    // Referral Programs - User read/write own, Admin read all
    match /referralPrograms/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow read: if request.auth.uid == "YOUR_ADMIN_UID";
    }
    
    // Referral History - Public read trending, User read own
    match /referralHistory/{document=**} {
      allow read: if request.auth.uid == resource.data.referrerId;
      allow create: if request.auth != null;
    }
    
    // Graphic Designers - Public read approved, Designer read/write own
    match /graphicDesigners/{document=**} {
      allow read: if resource.data.verified == true;
      allow write: if request.auth.uid == resource.data.uid;
      allow read, write: if request.auth.uid == "YOUR_ADMIN_UID";
    }
  }
}
*/

console.log('✅ Firebase Collections Setup Guide Created');
console.log('📋 Update YOUR_ADMIN_UID in the security rules with your Firebase admin UID');
console.log('🔐 Deploy the updated security rules to Firestore');
