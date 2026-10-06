import React from 'react';

const Loader = ({ fullScreen = true, message = 'Loading...' }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-brand-primary-light border-t-brand-primary rounded-full animate-spin"></div>
      {message && <p className="text-sm font-medium text-brand-text-secondary">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        {content}
      </div>
    );
  }

  return <div className="py-12 flex justify-center">{content}</div>;
};

export default Loader;
