import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let timer;
        if (isOpen) {
            timer = setTimeout(() => setIsVisible(true), 0);
        } else {
            timer = setTimeout(() => setIsVisible(false), 300);
        }
        return () => clearTimeout(timer);
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen && !isVisible) return null;

    return (
        <div
            className={`fixed top-0 left-0 w-full h-full bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-[2000] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`bg-white border border-slate-200 p-6 rounded-2xl w-[90%] max-w-[450px] shadow-2xl relative transition-all duration-300 transform ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <button
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors"
                    onClick={onClose}
                    aria-label="Close modal"
                >
                    <X size={20} />
                </button>
                <h2 id="modal-title" className="text-xl font-bold mb-6 text-slate-900 text-center tracking-tight">{title}</h2>
                <div className="text-slate-600">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
