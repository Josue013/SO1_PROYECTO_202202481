import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import "../styles/Header.css";

const Header = () => {
  const headerRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    // Animación del header deslizando desde arriba
    gsap.fromTo(headerRef.current, 
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    );

    // Efecto de escritura - dividir el texto en letras
    const text = titleRef.current;
    const textContent = text.textContent;
    text.textContent = '';
    
    // Crear spans para cada letra
    const letters = textContent.split('').map(letter => {
      const span = document.createElement('span');
      span.textContent = letter === ' ' ? '\u00A0' : letter; // Mantener espacios
      span.style.opacity = '0';
      return span;
    });
    
    letters.forEach(letter => text.appendChild(letter));

    // Animar cada letra apareciendo de izquierda a derecha
    gsap.to(letters, {
      opacity: 1,
      duration: 0.05,
      stagger: 0.05, // Cada letra aparece 0.05s después de la anterior
      ease: "none",
      delay: 0.5
    });

  }, []);

  return (
    <header className="header" ref={headerRef}>
      <h1 ref={titleRef}>Dashboard de Métricas</h1>
    </header>
  );
}

export default Header;