import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

// Wraps the entire app so any component can call useAuth() to get current user info.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase Auth user
  const [profile, setProfile] = useState(null); // Firestore user document
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged fires whenever login/logout happens
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Load Firestore profile to get role, schedule, timezone
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsub; // cleanup listener on unmount
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
