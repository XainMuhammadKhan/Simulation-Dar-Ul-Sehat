import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <header className="bg-gradient-to-r from-[#2C80D3] to-[#0C3E72] text-white py-4 sticky top-0 shadow-md z-10">
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link to="/" className="text-3xl font-bold tracking-wide hover:text-sky-200 transition duration-300">
          Dar-Ul-Sehat Hospital
        </Link>
        <nav>
          <ul className="flex gap-10">
            <li>
              <Link to="/" className="hover:text-sky-200 transition duration-300 font-semibold">
                Home
              </Link>
            </li>
            <li>
              <a href="#features" className="hover:text-sky-200 transition duration-300 font-semibold">
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="hover:text-sky-200 transition duration-300 font-semibold">
                How It Works
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:text-sky-200 transition duration-300 font-semibold">
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;