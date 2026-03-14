import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function LoginPage() {
  async function login(formData: FormData) {
    'use server';
    
    const password = formData.get('password');
    const expectedPassword = process.env.APP_PASSWORD || 'admin';
    
    if (password === expectedPassword) {
      const cookieStore = await cookies();
      cookieStore.set('auth_token', 'authenticated', { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      redirect('/dashboard');
    }
    // Note: To return error state in server actions we usually use useActionState, 
    // but for simplicity here we redirect with error param
    redirect('/?error=1');
  }

  return (
    <main className="login-wrapper">
      <div className="glass-panel login-card">
        <h1>Kwik<span>wiii</span></h1>
        <p>Social Media Publisher</p>
        
        <form action={login}>
          <div className="form-group" style={{ textAlign: 'left', marginTop: '1.5rem' }}>
            <label htmlFor="password" className="form-label">
              Mot de passe
            </label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              className="form-input" 
              placeholder="Entrez votre mot de passe"
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '0.5rem'}}>
            Se connecter →
          </button>
        </form>
      </div>
    </main>
  );
}
