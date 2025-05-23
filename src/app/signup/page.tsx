
"use client";

import type React from 'react';
import AppLayout from '@/layout/AppLayout';
import { SignupForm } from '@/components/auth/SignupForm';

const SignupPage = () => {
  return (
    <AppLayout>
      <div className="flex flex-col flex-grow items-center justify-center p-4 min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
        <SignupForm />
      </div>
    </AppLayout>
  );
};

export default SignupPage;
