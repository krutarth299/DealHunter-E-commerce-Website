import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Flame, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContextDefinition';

const Signup = ({ showToast }) => {
    const navigate = useNavigate();
    const { register } = useContext(AuthContext);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await register(formData.name, formData.email, formData.password);
            if (res.success) {
                showToast('Registration successful! Please log in.', 'success');
                navigate('/login');
            } else {
                showToast(res.message || 'Registration failed', 'error');
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
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Join the Community</h2>
                    <p className="text-slate-500 font-medium mt-2">Create an account to start tracking deals.</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 border border-slate-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all text-slate-900"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all text-slate-900"
                                    placeholder="your@email.com"
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

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full h-16 bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Create Account <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Already have an account? <Link to="/login" className="text-orange-500 hover:underline">Log in here</Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 flex items-center justify-center gap-2 opacity-30">
                   <ShieldCheck size={16} />
                   <span className="text-[10px] font-black uppercase tracking-widest">100% Secure & Private</span>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
