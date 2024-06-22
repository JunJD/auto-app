import { useEffect, useRef, useState, useCallback } from 'react';

const useLazyLoad = (callback: () => void, threshold = 0.1) => {
    const observer = useRef<IntersectionObserver | null>(null);
    const [node, setNode] = useState<HTMLElement | null>(null);

    const disconnectObserver = () => {
        if (observer.current) {
            observer.current.disconnect();
        }
    };

    const observeNode = useCallback(() => {
        if (node) {
            observer.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        callback();
                    }
                },
                { threshold }
            );
            observer.current.observe(node);
        }
    }, [node, callback, threshold]);

    useEffect(() => {
        observeNode();
        return () => disconnectObserver();
    }, [observeNode]);

    return setNode;
};

export default useLazyLoad