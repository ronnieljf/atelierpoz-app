/**
 * Utilidades para hash y verificación de contraseñas
 * Usando Web Crypto API
 */

export async function hashPassword(password: string): Promise<string> {
  // Usar Web Crypto API para crear un hash
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convertir a base64 para almacenamiento
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Agregar salt (en producción, usar un salt único por contraseña)
  // Por simplicidad, aquí usamos un salt fijo, pero deberías generar uno único
  const salt = 'atelierpoz_salt_2024'; // En producción, generar salt único
  const saltedHash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(hashHex + salt)
  );
  
  const saltedArray = Array.from(new Uint8Array(saltedHash));
  return saltedArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}

// Versión mejorada con salt único (recomendado para producción)
export async function hashPasswordWithSalt(password: string): Promise<{ hash: string; salt: string }> {
  // Generar salt aleatorio
  const saltArray = new Uint8Array(16);
  crypto.getRandomValues(saltArray);
  const salt = Array.from(saltArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Hash password + salt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { hash, salt };
}

export async function verifyPasswordWithSalt(
  password: string,
  hashedPassword: string,
  salt: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hash === hashedPassword;
}
