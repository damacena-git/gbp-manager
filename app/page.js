'use client';


import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Sparkles, BarChart3, MessageSquare, Zap, ArrowRight, Mail, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/dashboard';
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setSuccess('Conta criada! Verifique seu email para confirmar.');
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : err.message);
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: MapPin, title: 'Multi-Perfil', desc: 'Gerencie até 50 clientes em um só lugar' },
    { icon: Sparkles, title: 'IA Generativa', desc: 'Posts e respostas gerados pelo Gemini' },
    { icon: BarChart3, title: 'Analytics', desc: 'Métricas detalhadas de performance' },
    { icon: MessageSquare, title: 'Reviews', desc: 'Responda avaliações automaticamente' },
  ];

  return (
    <div style={styles.page}>
      {/* Background effects */}
      <div style={styles.bgGradient1} />
      <div style={styles.bgGradient2} />
      <div style={styles.bgGrid} />

      <div style={styles.container}>
        {/* Left side — Branding */}
        <div style={styles.left}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <Zap size={28} />
            </div>
            <span style={styles.logoText}>GBP Manager</span>
          </div>

          <h1 style={styles.headline}>
            Gerencie o Google Meu Negócio com{' '}
            <span style={styles.headlineGradient}>Inteligência Artificial</span>
          </h1>

          <p style={styles.subheadline}>
            Automatize posts, responda avaliações e acompanhe métricas de todos os seus clientes em uma única plataforma.
          </p>

          <div style={styles.features}>
            {features.map((f, i) => (
              <div key={i} style={styles.featureItem}>
                <div style={styles.featureIcon}>
                  <f.icon size={18} />
                </div>
                <div>
                  <div style={styles.featureTitle}>{f.title}</div>
                  <div style={styles.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side — Form */}
        <div style={styles.right}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>{isLogin ? 'Entrar' : 'Criar conta'}</h2>
              <p style={styles.formSubtitle}>
                {isLogin ? 'Acesse seu painel de gestão' : 'Comece a gerenciar seus perfis'}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              {!isLogin && (
                <div className="input-group">
                  <label className="input-label">Nome completo</label>
                  <div style={styles.inputWrapper}>
                    <User size={18} style={styles.inputIcon} />
                    <input
                      className="input"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      style={styles.inputField}
                    />
                  </div>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Email</label>
                <div style={styles.inputWrapper}>
                  <Mail size={18} style={styles.inputIcon} />
                  <input
                    className="input"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={styles.inputField}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Senha</label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} style={styles.inputIcon} />
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    style={styles.inputField}
                  />
                </div>
              </div>

              {error && <div style={styles.error}>{error}</div>}
              {success && <div style={styles.success}>{success}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%', marginTop: 8 }}
              >
                {loading ? (
                  <div className="spinner" />
                ) : (
                  <>
                    {isLogin ? 'Entrar' : 'Criar conta'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div style={styles.divider}>
              <span style={styles.dividerText}>ou</span>
            </div>

            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              {isLogin ? 'Criar uma conta nova' : 'Já tenho uma conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  bgGradient1: {
    position: 'absolute',
    top: '-30%',
    left: '-10%',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  bgGradient2: {
    position: 'absolute',
    bottom: '-20%',
    right: '-10%',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  container: {
    display: 'flex',
    maxWidth: '1100px',
    width: '100%',
    gap: '80px',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  left: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  headline: {
    fontSize: '2.75rem',
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: '-0.03em',
  },
  headlineGradient: {
    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subheadline: {
    fontSize: '1.125rem',
    color: '#9CA3AF',
    lineHeight: 1.7,
  },
  features: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginTop: '8px',
  },
  featureItem: {
    display: 'flex',
    gap: '12px',
    padding: '14px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.25s ease',
  },
  featureIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#3B82F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: '2px',
  },
  featureDesc: {
    fontSize: '0.75rem',
    color: '#6B7280',
  },
  right: {
    width: '420px',
    flexShrink: 0,
  },
  formCard: {
    background: 'rgba(17, 24, 39, 0.8)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px',
    padding: '36px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  },
  formHeader: {
    marginBottom: '28px',
  },
  formTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '6px',
  },
  formSubtitle: {
    fontSize: '0.875rem',
    color: '#9CA3AF',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#6B7280',
    pointerEvents: 'none',
  },
  inputField: {
    width: '100%',
    paddingLeft: '42px',
  },
  error: {
    padding: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    color: '#EF4444',
    fontSize: '0.875rem',
  },
  success: {
    padding: '12px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '10px',
    color: '#10B981',
    fontSize: '0.875rem',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    margin: '20px 0',
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: '0.8125rem',
    color: '#4B5563',
    position: 'relative',
  },
};
