import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Flame, Mail, Lock, ArrowRight, ShieldCheck, UserPlus, ShoppingCart, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContextDefinition';

const Login = ({ showToast }) => {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await login(formData.email, formData.password);
            if (res.success) {
                showToast('Welcome back, Admin!', 'success');
                navigate('/admin/dashboard');
            } else {
                showToast(res.message || 'Invalid credentials', 'error');
            }
        } catch (err) {
            showToast('Server error', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
            {/* Decorative Mesh */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-100/40 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-100/40 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-12">
                    <Link to="/" className="inline-flex items-center gap-4 group mb-8">
                        <img src="/logo.png" alt="DealSphere" className="h-24 w-auto object-contain bg-white rounded-2xl p-3 shadow-xl scale-105" />
                        <span className="text-4xl font-[1000] tracking-tighter text-slate-900">
                            <span className="text-[#1E3A8A]">DEAL</span><span className="text-[#F97316]">SPHERE</span>
                        </span>
                    </Link>
                    <h2 className="text-4xl font-[1000] text-slate-900 tracking-tight leading-none mb-4">Elite Access</h2>
                    <p className="text-slate-500 font-medium text-lg opacity-80">Re-enter the command center.</p>
                </div>

                <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] border border-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
                    
                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Intelligence ID</label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-orange-500/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-2xl" />
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full bg-slate-50/50 backdrop-blur-sm border border-slate-100 rounded-[1.4rem] py-5 pl-14 pr-6 text-base font-bold outline-none focus:bg-white focus:border-orange-500/30 focus:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.1)] transition-all text-slate-900 placeholder:text-slate-300"
                                    placeholder="admin@dealsphere.com"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Secure Cipher</label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-2xl" />
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full bg-slate-50/50 backdrop-blur-sm border border-slate-100 rounded-[1.4rem] py-5 pl-14 pr-6 text-base font-bold outline-none focus:bg-white focus:border-blue-500/30 focus:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.1)] transition-all text-slate-900 placeholder:text-slate-300"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest px-2">
                            <label className="flex items-center gap-3 text-slate-400 cursor-pointer group">
                                <div className="relative w-5 h-5">
                                    <input type="checkbox" className="peer sr-only" />
                                    <div className="absolute inset-0 bg-slate-100 border border-slate-200 rounded-lg transition-all peer-checked:bg-orange-500 peer-checked:border-orange-500" />
                                    <ShieldCheck size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                Keep Authenticated
                            </label>
                            <Link to="#" className="text-orange-500 hover:text-red-600 transition-colors">Forgot Cipher?</Link>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full h-18 bg-slate-900 hover:bg-orange-500 disabled:bg-slate-300 text-white rounded-[1.4rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:shadow-orange-500/30 transition-all active:scale-[0.96] flex items-center justify-center gap-3 group py-5"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Initialize Command <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-slate-50 text-center">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            New Recruit? <Link to="/signup" className="text-orange-500 hover:underline">Apply for Access</Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 flex items-center justify-center gap-3 opacity-20">
                   <ShieldCheck size={18} />
                   <span className="text-[11px] font-[1000] uppercase tracking-[0.3em]">Encrypted Connection Active</span>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
