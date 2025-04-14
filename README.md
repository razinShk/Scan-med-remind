# Medicine Reminder App

A mobile application to help users manage their medications, built with React Native and Expo.

## Features

- User authentication with Supabase
- In-app purchases with RevenueCat
- Medication tracking and reminders
- Subscription management
- Referral system
- Coupon code redemption

## Subscription Features

- Free tier with limited functionality
- Premium subscription with additional features
- Monthly and yearly subscription options
- Coupon code support
- Referral system for free trial extensions

## Technical Implementation

### Supabase Integration

The app uses Supabase for:
- User authentication and profile management
- Storing subscription data
- Coupon code validation
- Referral tracking

### RevenueCat Integration

The app uses RevenueCat for:
- In-app purchase management
- Subscription lifecycle management
- Entitlement verification
- Cross-platform purchase restoration

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up your Supabase and RevenueCat accounts
4. Configure your API keys in the environment variables
5. Run the app with `npm start`

## Environment Variables

The app requires the following environment variables in expo-env.d.ts:

```typescript
service_role='YOUR_SUPABASE_SERVICE_ROLE_KEY';
anonpublic='YOUR_SUPABASE_ANON_KEY';
URL='YOUR_SUPABASE_URL';
PublicSDK(PlayStore)='YOUR_REVENUECAT_ANDROID_KEY';
secretkeyrevenuecat='YOUR_REVENUECAT_SECRET_KEY';
```

## Project Structure

- `app/` - Main application code
  - `services/` - Service layer for API interactions
    - `SupabaseService.ts` - Supabase API wrapper
    - `RevenueCatService.ts` - RevenueCat API wrapper
    - `AuthContext.tsx` - Authentication context provider
    - `SubscriptionContext.tsx` - Subscription management context
  - `subscription/` - Subscription screens
  - Other app screens and components

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
