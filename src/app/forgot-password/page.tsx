
"use client";

import type React from 'react';
import AppLayout from '@/layout/AppLayout';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

const ForgotPasswordPage = () => {
  return (
    <AppLayout>
      <div className="flex flex-col flex-grow items-center justify-center p-4 min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
        <ForgotPasswordForm />
      </div>
    </AppLayout>
  );
};

export default ForgotPasswordPage;
