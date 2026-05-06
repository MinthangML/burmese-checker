import React from "react";
import {
  AdEventType,
  InterstitialAd,
} from "react-native-google-mobile-ads";

export function AdMobInterstitial({ shouldShow, triggerKey, unitId }) {
  const loadedRef = React.useRef(false);
  const loadingRef = React.useRef(false);
  const pendingTriggerRef = React.useRef(null);
  const shownTriggerRef = React.useRef(null);
  const interstitialAd = React.useMemo(
    () =>
      InterstitialAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: true,
      }),
    [unitId]
  );

  const loadInterstitialAd = React.useCallback(() => {
    if (loadedRef.current || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    interstitialAd.load();
  }, [interstitialAd]);

  const showInterstitialAd = React.useCallback(
    (nextTriggerKey) => {
      if (shownTriggerRef.current === nextTriggerKey || !loadedRef.current) {
        return;
      }

      shownTriggerRef.current = nextTriggerKey;
      pendingTriggerRef.current = null;
      loadedRef.current = false;

      const showResult = interstitialAd.show();
      showResult?.catch?.(() => {
        loadInterstitialAd();
      });
    },
    [interstitialAd, loadInterstitialAd]
  );

  React.useEffect(() => {
    const unsubscribeLoaded = interstitialAd.addAdEventListener(
      AdEventType.LOADED,
      () => {
        loadedRef.current = true;
        loadingRef.current = false;

        if (pendingTriggerRef.current) {
          showInterstitialAd(pendingTriggerRef.current);
        }
      }
    );
    const unsubscribeClosed = interstitialAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        loadedRef.current = false;
        loadInterstitialAd();
      }
    );
    const unsubscribeError = interstitialAd.addAdEventListener(
      AdEventType.ERROR,
      () => {
        loadedRef.current = false;
        loadingRef.current = false;
      }
    );

    loadInterstitialAd();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [interstitialAd, loadInterstitialAd, showInterstitialAd]);

  React.useEffect(() => {
    if (!shouldShow || !triggerKey) {
      pendingTriggerRef.current = null;
      shownTriggerRef.current = null;
      return;
    }

    if (shownTriggerRef.current === triggerKey) {
      return;
    }

    if (loadedRef.current) {
      showInterstitialAd(triggerKey);
      return;
    }

    pendingTriggerRef.current = triggerKey;
    loadInterstitialAd();
  }, [loadInterstitialAd, shouldShow, showInterstitialAd, triggerKey]);

  return null;
}
