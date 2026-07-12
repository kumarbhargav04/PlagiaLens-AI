import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineMoon, HiOutlineSun, HiOutlineChartBar, HiOutlineCloudUpload, HiOutlineCog } from 'react-icons/hi';

const Navbar = ({ darkMode, toggleTheme }) => {
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <HiOutlineChartBar size={20} /> },
    { name: 'Upload', path: '/upload', icon: <HiOutlineCloudUpload size={20} /> },
    { name: 'Settings', path: '/settings', icon: <HiOutlineCog size={20} /> },
  ];

  return (
    <nav className="glass sticky top-0 z-50 p-4 mb-8">
      <div className="container flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="PlagScan Logo" className="h-10 w-auto rounded-md shadow-sm" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary hidden sm:block">
            PlagScan
          </span>
        </Link>
        
        <div className="flex items-center gap-8">
          <div className="flex gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center gap-2 font-medium transition-colors ${
                  location.pathname === link.path 
                    ? 'text-primary' 
                    : 'hover:text-primary'
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            ))}
          </div>
          
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle Theme"
          >
            {darkMode ? <HiOutlineSun size={24} /> : <HiOutlineMoon size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
