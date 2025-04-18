// lib/hooks/useUndoRedo.ts
// REFACTOR / OVERWRITE
import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from './useDebounce';

interface UndoRedoOptions {
  maxLength?: number;  // history depth (ring‑buffer)
  debounceMs?: number; // 0 = write on every change
}

const DEFAULT_MAX = 500;
const BOOST_DELAY_MS = 450;                  // Increased delay before acceleration starts
const BOOST_STEPS   = [1, 2, 4, 8, 16];      // Exponential acceleration steps

/**
 * Manages undo/redo history for a given value.
 * Includes typematic acceleration for both undo and redo operations.
 *
 * @param initialValue The initial state value.
 * @param setExternal Callback to update the external state (e.g., Zustand setter).
 * @param options Configuration for history length and debouncing.
 */
export function useUndoRedo<T>(
  initialValue: T,
  setExternal: (v: T) => void,
  { maxLength = DEFAULT_MAX, debounceMs = 0 }: UndoRedoOptions = {},
) {
  const instant = debounceMs === 0;
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [redoStack, setRedoStack] = useState<T[]>([]);
  const historyIndexRef = useRef(0);
  const lastUndoTimeRef = useRef(0); // Separate timer for undo
  const lastRedoTimeRef = useRef(0); // Separate timer for redo
  const undoAccelCountRef = useRef(0); // Separate counter for undo
  const redoAccelCountRef = useRef(0); // Separate counter for redo
  const currentValueRef = useRef(initialValue);

  /** Push a new state, trimming history if required */
  const pushState = useCallback((val: T) => {
    if (history[historyIndexRef.current] === val) return;

    const newHistorySlice = history.slice(0, historyIndexRef.current + 1);
    newHistorySlice.push(val);

    while (newHistorySlice.length > maxLength) {
      newHistorySlice.shift();
    }

    historyIndexRef.current = newHistorySlice.length - 1;

    setHistory(newHistorySlice);
    setRedoStack([]); // Clear redo stack
    // Reset both acceleration timers/counters on new action
    lastUndoTimeRef.current = 0;
    lastRedoTimeRef.current = 0;
    undoAccelCountRef.current = 0;
    redoAccelCountRef.current = 0;
  }, [history, maxLength]);

  /** Core setter used by the UI component's onChange */
  const updateCurrentValue = useCallback((val: T) => {
    currentValueRef.current = val;
    setExternal(val);
    if (instant) {
      pushState(val);
    }
  }, [instant, pushState, setExternal]);

  /* Debounced snapshot */
  const debouncedValue = useDebounce(currentValueRef.current, debounceMs);
  useEffect(() => {
    if (!instant && debouncedValue !== history[historyIndexRef.current]) {
      pushState(debouncedValue);
    }
  }, [debouncedValue, instant, pushState, history]);

  /* Handle external hard‑reset */
  useEffect(() => {
    if (initialValue !== currentValueRef.current) {
        currentValueRef.current = initialValue;
        setHistory([initialValue]);
        setRedoStack([]);
        historyIndexRef.current = 0;
        lastUndoTimeRef.current = 0;
        lastRedoTimeRef.current = 0;
        undoAccelCountRef.current = 0;
        redoAccelCountRef.current = 0;
    }
  }, [initialValue]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = redoStack.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    /* Undo Acceleration */
    let steps = 1;
    const now = Date.now();
    if (now - lastUndoTimeRef.current < BOOST_DELAY_MS) {
      undoAccelCountRef.current = Math.min(undoAccelCountRef.current + 1, BOOST_STEPS.length - 1);
      steps = BOOST_STEPS[undoAccelCountRef.current];
    } else {
      undoAccelCountRef.current = 0; // Reset if delay too long
    }
    lastUndoTimeRef.current = now; // Record time

    // Reset redo acceleration when undoing
    lastRedoTimeRef.current = 0;
    redoAccelCountRef.current = 0;

    steps = Math.min(steps, historyIndexRef.current);
    const targetIndex = historyIndexRef.current - steps;
    const statesToRedo = history.slice(targetIndex + 1, historyIndexRef.current + 1);
    setRedoStack(prev => [...statesToRedo, ...prev]);

    historyIndexRef.current = targetIndex;
    const valueToRestore = history[targetIndex];
    currentValueRef.current = valueToRestore;
    setExternal(valueToRestore);

  }, [canUndo, history, setExternal]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    /* Redo Acceleration */
    let steps = 1;
    const now = Date.now();
    if (now - lastRedoTimeRef.current < BOOST_DELAY_MS) {
        redoAccelCountRef.current = Math.min(redoAccelCountRef.current + 1, BOOST_STEPS.length - 1);
        steps = BOOST_STEPS[redoAccelCountRef.current];
    } else {
        redoAccelCountRef.current = 0; // Reset if delay too long
    }
    lastRedoTimeRef.current = now; // Record time

    // Reset undo acceleration when redoing
    lastUndoTimeRef.current = 0;
    undoAccelCountRef.current = 0;

    steps = Math.min(steps, redoStack.length); // Ensure steps don't exceed redo stack size
    const statesToRestore = redoStack.slice(0, steps);
    const remainingRedoStack = redoStack.slice(steps);

    // Add the redone states back to the history
    const newHistorySlice = history.slice(0, historyIndexRef.current + 1);
    newHistorySlice.push(...statesToRestore);

    // Trim history if needed
    while (newHistorySlice.length > maxLength) {
        newHistorySlice.shift();
    }
    historyIndexRef.current = newHistorySlice.length - 1;

    setHistory(newHistorySlice);
    setRedoStack(remainingRedoStack);

    // Update external state to the last restored value
    const lastValueRestored = statesToRestore[statesToRestore.length - 1];
    currentValueRef.current = lastValueRestored;
    setExternal(lastValueRestored);

  }, [canRedo, history, redoStack, maxLength, setExternal]);

  return {
    currentValue: currentValueRef.current,
    updateCurrentValue,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}