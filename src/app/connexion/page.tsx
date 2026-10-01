export const dynamic = 'force-dynamic'

export default function ConnexionPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F6FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <form method="POST" action="/api/auth/login" style={{ background: '#fff', padding: 32, borderRadius: 16, border: '1px solid #EDEAF5', width: 340 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A186E', margin: '0 0 20px', textAlign: 'center' }}>MOJO SALES</h1>
        <p style={{ fontSize: 13, color: '#6B6680', margin: '0 0 16px', textAlign: 'center' }}>Connexion</p>
        {searchParams.error && (
          <p style={{ fontSize: 13, color: '#C8399A', margin: '0 0 16px', textAlign: 'center' }}>
            {searchParams.error === 'inactif' ? 'Compte inactif ou profil introuvable.' : 'Identifiants incorrects.'}
          </p>
        )}
        <input name="email" type="email" placeholder="Email" required autoFocus
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #EDEAF5', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' as const, marginBottom: 12 }} />
        <input name="password" type="password" placeholder="Mot de passe" required
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #EDEAF5', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' as const, marginBottom: 12 }} />
        <button type="submit"
          style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6B35B8, #C8399A)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Se connecter →
        </button>
      </form>
    </div>
  )
}
