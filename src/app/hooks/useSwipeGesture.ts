import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { haptics } from "../utils/haptics";
import { sounds } from "../utils/sounds";

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number;
  minSwipeVelocity?: number;
}

export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance = 50,
    minSwipeVelocity = 0.3,
  } = options;

  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number; time: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now(),
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now(),
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const timeDiff = touchEnd.time - touchStart.time;

    const velocityX = Math.abs(distanceX) / timeDiff;
    const velocityY = Math.abs(distanceY) / timeDiff;

    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    // Horizontal swipe
    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance && velocityX > minSwipeVelocity) {
      if (distanceX > 0 && onSwipeLeft) {
        haptics.light();
        sounds.playClick();
        onSwipeLeft();
      } else if (distanceX < 0 && onSwipeRight) {
        haptics.light();
        sounds.playClick();
        onSwipeRight();
      }
    }

    // Vertical swipe
    if (isVerticalSwipe && Math.abs(distanceY) > minSwipeDistance && velocityY > minSwipeVelocity) {
      if (distanceY > 0 && onSwipeUp) {
        haptics.light();
        onSwipeUp();
      } else if (distanceY < 0 && onSwipeDown) {
        haptics.light();
        onSwipeDown();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

// Hook for back navigation via swipe
export function useSwipeBack() {
  const navigate = useNavigate();

  return useSwipeGesture({
    onSwipeRight: () => {
      navigate(-1);
      sounds.playClick();
    },
  });
}

// Hook for modal dismiss via swipe down
export function useSwipeDismiss(onDismiss: () => void) {
  return useSwipeGesture({
    onSwipeDown: () => {
      sounds.playClick();
      onDismiss();
    },
  });
}
