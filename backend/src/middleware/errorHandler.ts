import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack)

  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message })
    return
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Não autorizado' })
    return
  }

  res.status(500).json({ error: 'Erro interno do servidor' })
}
