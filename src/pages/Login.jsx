import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Flame, Mail, Lock, ArrowRight, ShieldCheck, UserPlus } from 'lucide-react';
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
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center px-4 py-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex items-center gap-2 group mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                            <Flame size={24} className="text-white" fill="currentColor" />
                        </div>
                        <span className="font-black text-3xl tracking-tighter text-slate-900 text-left">
                            DEAL<span className="text-orange-500">HUNTER</span>
                        </span>
                    </Link>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
                    <p className="text-slate-500 font-medium mt-2">Log in to manage your deals and dashboard.</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 border border-slate-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all text-slate-900"
                                    placeholder="admin@dealshunter.com"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all text-slate-900"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest px-1">
                            <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-200 text-orange-500 focus:ring-orange-500" />
                                Remember Me
                            </label>
                            <Link to="#" className="text-orange-500 hover:text-orange-600 transition-colors">Forgot?</Link>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full h-16 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            New here? <Link to="/signup" className="text-orange-500 hover:underline">Create an account</Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 flex items-center justify-center gap-8 opacity-40 grayscale pointer-events-none">
                   <ShieldCheck size={24} />
                   <UserPlus size={24} />
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
