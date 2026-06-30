import React from 'react';

const Skeleton = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-250 dark:bg-gray-750 rounded-md ${className}`}
        />
      ))}
    </>
  );
};

export default Skeleton;
