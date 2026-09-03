import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const ROLES = {
  COORDINATOR: { id: 'coordinator', label: 'Bed Coordinator', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  NURSE: { id: 'nurse', label: 'Nurse / Clinical Staff', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  CLINICIAN: { id: 'clinician', label: 'Clinician / Doctor', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  HOUSEKEEPING: { id: 'housekeeping', label: 'Housekeeping Staff', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  ADMIN: { id: 'admin', label: 'Administrator', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
};

export const AuthProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState(ROLES.COORDINATOR.id);

  const currentUser = {
    coordinator: { name: 'Sarah Vance', role: 'Bed Coordinator', avatar: 'SV' },
    nurse: { name: 'Nurse Kelly', role: 'Clinical Staff Nurse', avatar: 'NK' },
    clinician: { name: 'Dr. Aris Thorne', role: 'Attending Clinician', avatar: 'AT' },
    housekeeping: { name: 'John Miller', role: 'Housekeeping Lead', avatar: 'JM' },
    admin: { name: 'System Admin', role: 'Operations Director', avatar: 'SA' }
  }[currentRole];

  return (
    <AuthContext.Provider value={{ currentRole, setCurrentRole, currentUser, ROLES }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
