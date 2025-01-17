import jwt from 'jsonwebtoken';

const generateToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export { generateToken, verifyToken };
