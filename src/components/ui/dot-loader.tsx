"use client";

import { ComponentProps, useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type DotLoaderProps = {
    frames: number[][];
    dotClassName?: string;
    isPlaying?: boolean;
    duration?: number;
    repeatCount?: number;
    onComplete?: () => void;
} & ComponentProps<"div">;

export const DotLoader = ({
    frames,
    isPlaying = true,
    duration = 100,
    dotClassName,
    className,
    repeatCount = -1,
    onComplete,
    ...props
}: DotLoaderProps) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const currentIndex = useRef(0);
    const repeats = useRef(0);
    const interval = useRef<NodeJS.Timeout>(null);

    const applyFrameToDots = useCallback(
        (dots: HTMLDivElement[], frameIndex: number) => {
            const frame = frames[frameIndex];
            if (!frame) return;

            dots.forEach((dot, index) => {
                const isActive = frame.includes(index);
                dot.classList.toggle("active", isActive);
                // Beautiful colors: cyan active, dark gray inactive
                dot.style.backgroundColor = isActive ? '#06b6d4' : '#374151'; // cyan-500 : gray-700
                dot.style.opacity = '1';
            });
        },
        [frames],
    );

    useEffect(() => {
        currentIndex.current = 0;
        repeats.current = 0;
    }, [frames]);

    useEffect(() => {
        if (isPlaying) {
            if (currentIndex.current >= frames.length) {
                currentIndex.current = 0;
            }
            const dotElements = gridRef.current?.children;
            if (!dotElements) return;
            const dots = Array.from(dotElements) as HTMLDivElement[];

            interval.current = setInterval(() => {
                applyFrameToDots(dots, currentIndex.current);
                currentIndex.current = (currentIndex.current + 1) % frames.length;
            }, duration);
        } else {
            if (interval.current) clearInterval(interval.current);
        }

        return () => {
            if (interval.current) clearInterval(interval.current);
        };
    }, [frames, isPlaying, applyFrameToDots, duration, repeatCount, onComplete]);

    return (
        <div {...props} ref={gridRef} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            width: 'fit-content',
            padding: '20px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderRadius: '16px',
            border: '2px solid rgba(255,255,255,0.1)'
        }}>
            {Array.from({ length: 49 }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#374151',
                        transition: 'all 150ms ease',
                        boxShadow: '0 0 4px rgba(0,0,0,0.3)'
                    }}
                />
            ))}
        </div>
    );
};
