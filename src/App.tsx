// import { useEffect, useState } from "react";
// import {
//   signInWithPopup,
//   signOut,
//   onAuthStateChanged,
//   type User,
// } from "firebase/auth";
// import { auth, googleProvider } from "./lib/firebase";

// function App() {
//   const [user, setUser] = useState<User | null>(null);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//     });

//     return () => unsubscribe();
//   }, []);

//   async function loginGoogle() {
//     try {
//       await signInWithPopup(auth, googleProvider);
//     } catch (error) {
//       console.log(error);
//     }
//   }

//   async function logout() {
//     await signOut(auth);
//   }

//   return (
//     <div style={{ padding: 30 }}>
//       <h1>Firebase Auth</h1>

//       {user ? (
//         <>
//           <img
//             src={user.photoURL || ""}
//             width={80}
//             style={{ borderRadius: "50%" }}
//           />
//           <h2>{user.displayName}</h2>
//           <p>{user.email}</p>

//           <button onClick={logout}>Logout</button>
//         </>
//       ) : (
//         <button onClick={loginGoogle}>Login dengan Google</button>
//       )}
//     </div>
//   );
// }

// export default App;


import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login     from "./pages/Login";
import Register  from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}