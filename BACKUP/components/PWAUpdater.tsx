import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download } from 'lucide-react';

const PWAUpdater: React.FC = () => {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const registerSW = async () => {
            try {
                const registration = await navigator.serviceWorker.register(
                    import.meta.env.MODE === 'production' ? '/sw.js' : '/dev-sw.js?dev-sw',
                    { type: 'module' }
                );

                setSwRegistration(registration);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            setNeedRefresh(true);
                        }
                    });
                });
            } catch {
                // SW registration failed silently - non-critical for app functionality
            }
        };

        registerSW();
    }, []);

    useEffect(() => {
        if (!needRefresh) return;

        toast((t) => (
            <div className="flex flex-col gap-2">
                <p className="font-bold">Nova versao disponivel!</p>
                <p className="text-sm">Clique para atualizar a aplicacao.</p>
                <button
                    onClick={() => {
                        if (swRegistration?.waiting) {
                            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }
                        toast.dismiss(t.id);
                        window.location.reload();
                    }}
                    className="mt-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-700 transition"
                >
                    <Download size={16} />
                    Atualizar Agora
                </button>
            </div>
        ), {
            duration: Infinity,
            position: 'bottom-right',
        });
    }, [needRefresh, swRegistration]);

    return null;
};

export default PWAUpdater;
