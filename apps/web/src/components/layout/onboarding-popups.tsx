'use client';

import { useEffect, useState } from 'react';
import { BellIcon, BookIcon } from '@/components/icons/office-icons';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/lib/auth-context';
import { enablePushNotifications, getPushSubscriptionState } from '@/lib/push-notifications';
import { useToast } from '@/lib/toast-context';

type Step = 'push' | 'docs' | null;

function docsSeenKey(userId: string) {
  return `ooffix_docs_popup_seen_${userId}`;
}

/** Deux pop-up de bienvenue, l'un après l'autre : activer les notifs push (reproposé à
 * chaque connexion tant que ce n'est pas activé — pas de drapeau persisté, on relit
 * juste l'état réel à chaque montage), puis un pointeur vers la doc (montré une seule
 * fois, mémorisé par utilisateur dans le localStorage de l'appareil). */
export function OnboardingPopups() {
  const { user } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<Step>(null);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const pushState = await getPushSubscriptionState();
      if (!active) return;
      if (pushState === 'not-subscribed') {
        setStep('push');
        return;
      }
      if (!localStorage.getItem(docsSeenKey(user.id))) setStep('docs');
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user || !step) return null;

  function goToDocsOrClose() {
    if (!localStorage.getItem(docsSeenKey(user!.id))) setStep('docs');
    else setStep(null);
  }

  function dismissDocs() {
    localStorage.setItem(docsSeenKey(user!.id), '1');
    setStep(null);
  }

  async function handleEnable() {
    setEnabling(true);
    try {
      await enablePushNotifications();
      toast('Push notifications enabled');
      goToDocsOrClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not enable push notifications', 'error');
    } finally {
      setEnabling(false);
    }
  }

  function openDocs() {
    window.open('/docs/getting-started', '_blank', 'noopener,noreferrer');
    dismissDocs();
  }

  if (step === 'push') {
    return (
      <Modal onClose={goToDocsOrClose}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue">
            <BellIcon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">Turn on push notifications</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Get notified the moment a task is assigned to you, mentioned, or waiting for your
              validation — even when OOffix is closed.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={enabling} onClick={handleEnable}>
              {enabling ? 'Enabling…' : 'Enable notifications'}
            </Button>
            <Button variant="secondary" className="flex-1" disabled={enabling} onClick={goToDocsOrClose}>
              Not now
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={dismissDocs}>
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue">
          <BookIcon className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-foreground">New here?</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Take two minutes to read the guide — it walks you through offices, tasks and
            Check-In so you find your way around fast.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={openDocs}>
            Read the guide
          </Button>
          <Button variant="secondary" className="flex-1" onClick={dismissDocs}>
            Maybe later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
