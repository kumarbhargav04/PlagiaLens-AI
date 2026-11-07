import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineMoon, HiOutlineSun, HiOutlineChartBar, HiOutlineCloudUpload, HiOutlineCog, HiOutlineLogout, HiOutlineUser } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ darkMode, toggleTheme }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = user ? [
    { name: 'Dashboard', path: '/dashboard', icon: <HiOutlineChartBar size={20} /> },
    { name: 'Upload', path: '/upload', icon: <HiOutlineCloudUpload size={20} /> },
  ] : [];

  return (
    <nav className="glass sticky top-0 z-50 p-4 mb-8">
      <div className="container flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="PlagScan Logo" className="h-10 w-auto rounded-md shadow-sm" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary hidden sm:block">
            PlagiaLens AI
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
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

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 focus:outline-none cursor-pointer"
              >
                <img 
                  src={user.avatar_url || '/logo.png'} 
                  alt={user.name || 'User'} 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border-2 border-primary object-cover shadow-sm hover:scale-105 transition-transform"
                />
              </button>
              
              {dropdownOpen && (
                <div className="glass absolute right-0 mt-3 p-4 w-64 rounded-2xl shadow-xl border border-gray-150 dark:border-gray-800 flex flex-col gap-3 text-left">
                  <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
                  >
                    <HiOutlineCog size={18} />
                    Settings
                  </Link>
                  
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium transition-colors w-full text-left cursor-pointer"
                  >
                    <HiOutlineLogout size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary px-5 py-2 text-sm">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

