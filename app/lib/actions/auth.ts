'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/app/lib/supabase/server';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    redirect('/login?error=format');
  }

  // Se distingue entre credenciales inválidas y errores de configuración
  // (env vars / conexión a Supabase) para poder diagnosticar el deploy.
  let outcome: 'ok' | 'credentials' | 'config' = 'ok';
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      console.error('[auth] login fallido:', error.code ?? error.name, '-', error.message);
      outcome = 'credentials';
    }
  } catch (err) {
    console.error('[auth] error de configuración en login:', err);
    outcome = 'config';
  }

  if (outcome !== 'ok') {
    redirect(`/login?error=${outcome}`);
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
