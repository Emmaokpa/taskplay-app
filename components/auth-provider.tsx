// src/components/auth-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { auth, db } from "@/lib/firebase/config"; 
// import { supabase } from "@/lib/supabase/supabaseClient";
import { onAuthStateChanged, User as FirebaseAuthUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { UserProfile } from "@/lib/types";

type AuthContextType = {
  user: UserProfile | null;
  idToken: string | null;
  isLoading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  idToken: null,
  isLoading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribeFirebase = onAuthStateChanged(
      auth,
      async (authUser: FirebaseAuthUser | null) => {
        if (!isMounted.current) return;

        if (authUser) {
          // console.log("AuthProvider: Firebase Auth State Changed - User signed in.", authUser.uid);

          try {
            const firebaseIdToken = await authUser.getIdToken();
            setIdToken(firebaseIdToken);
            // console.log("AuthProvider: Firebase ID Token obtained.");

            // // Attempt to sync with Supabase using the Firebase ID token
            // const { error: supabaseSignInError } = await supabase.auth.signInWithIdToken({
            //   provider: "firebase",
            //   token: firebaseIdToken,
            // });

            // if (supabaseSignInError) {
            //   console.error(
            //     "AuthProvider: Error signing in to Supabase with Firebase token:",
            //     supabaseSignInError.message
            //   );
            //   // Handle Supabase sync failure: e.g., prompt user, re-authenticate, or proceed with Firebase only.
            //   // For now, we proceed to fetch Firestore profile but log the error.
            // } else {
            //     console.log("AuthProvider: Successfully signed in to Supabase with Firebase token.");
            // }

            // Fetch user profile from Firestore and listen for real-time updates
            const userDocRef = doc(db, "users", authUser.uid);
            const unsubProfile = onSnapshot(
              userDocRef,
              docSnap => {
                if (!isMounted.current) return;

                if (docSnap.exists()) {
                  const firestoreData = docSnap.data();
                  // console.log("AuthProvider: Firestore User Profile Fetched:", firestoreData);

                  const userProfile: UserProfile = {
                    ...firestoreData,
                    uid: authUser.uid,
                    email: authUser.email,
                    displayName: authUser.displayName,
                    photoURL: authUser.photoURL,
                  } as UserProfile; // Cast if UserProfile might be stricter

                  setUser(userProfile);
                } else {
                  console.warn("AuthProvider: Firestore user profile does not exist for UID:", authUser.uid);
                  // Set a basic user profile from authUser if Firestore doc is missing
                  setUser({
                    uid: authUser.uid,
                    email: authUser.email,
                    displayName: authUser.displayName,
                    photoURL: authUser.photoURL,
                    isAdmin: false, // Default to false if not in Firestore
                  } as UserProfile);
                }
                setIsLoading(false); // Auth and profile data are now loaded
              },
              error => {
                if (!isMounted.current) return;
                console.error("AuthProvider: Error fetching user profile from Firestore:", error);
                setUser(null);
                setIdToken(null);
                setIsLoading(false); // Finished loading with an error
              }
            );

            return () => {
              // console.log("AuthProvider: Cleaning up Firestore profile listener.");
              unsubProfile();
            };

          } catch (error: any) {
            if (!isMounted.current) return;
            console.error("AuthProvider: Error during Firebase token acquisition or Supabase sync:", error.message);
            setUser(null);
            setIdToken(null);
            setIsLoading(false); // Finished loading with an error
          }
        } else {
          // User is signed out from Firebase.
          // console.log("AuthProvider: Firebase Auth State Changed - User signed out.");
          setUser(null);
          setIdToken(null); // Clear ID token on sign out
          setIsLoading(false); // Finished loading (no user)
          
          // // Also sign out from Supabase if they were signed in
          // supabase.auth.signOut().then(({ error }) => {
          //   if (error) {
          //     console.error("AuthProvider: Error signing out from Supabase:", error.message);
          //   } else {
          //     console.log("AuthProvider: Successfully signed out from Supabase.");
          //   }
          // });
        }
      }
    );

    return () => {
      // console.log("AuthProvider: Cleaning up Firebase auth listener.");
      unsubscribeFirebase();
    };
  }, []);

  const isAdmin = user?.isAdmin || false;

  return (
    <AuthContext.Provider value={{ user, idToken, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}