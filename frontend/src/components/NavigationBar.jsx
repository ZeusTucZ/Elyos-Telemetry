import React from "react";
import { Link } from "react-router-dom";
import logoElyos from '../assets/logoElyos.png'

export default function NavigationBar() {
    return (
        <nav className='text-white px-7 py-4 shadow-md'>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link to="/">
                <img src={logoElyos} alt="Elyos logo" className="h-12" />
                </Link>

                <div className="flex space-x-6 text-lg">
                <Link to="/dashboard" className="hover:text-gray-400">Dashboard</Link>
                <Link to="/sesiones" className="hover:text-gray-400">Sesiones</Link>
                <Link to="/pilotos" className="hover:text-gray-400">Pilotos</Link>
                <Link to="/configuraciones" className="hover:text-gray-400">Configuraciones</Link>
                </div>
            </div>
        </nav>
    );
}