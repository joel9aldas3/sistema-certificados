<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;
use App\Config\EmailConfig;

class EmailService {
    private $mailer;
    
    public function __construct() {
        $this->mailer = new PHPMailer(true);
        $this->configure();
    }
    
    /**
     * Configurar PHPMailer con las credenciales
     */
    private function configure() {
        try {
            $config = EmailConfig::getConfig();
            
            // Configuración del servidor
            $this->mailer->isSMTP();
            $this->mailer->Host = $config['host'];
            $this->mailer->SMTPAuth = true;
            $this->mailer->Username = $config['username'];
            $this->mailer->Password = $config['password'];
            $this->mailer->SMTPSecure = $config['secure'];
            $this->mailer->Port = $config['port'];
            
            // Configuración de codificación
            $this->mailer->CharSet = 'UTF-8';
            $this->mailer->Encoding = 'base64';
            
            // Configuración del remitente
            $this->mailer->setFrom($config['from_email'], $config['from_name']);
            $this->mailer->addReplyTo($config['reply_to_email'], $config['reply_to_name']);
            
            // Configuración para debugging (desactivar en producción)
            // $this->mailer->SMTPDebug = SMTP::DEBUG_SERVER;
            
        } catch (Exception $e) {
            error_log("Error configurando PHPMailer: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Enviar certificado por email
     */
    public function sendCertificate($participantData, $certificatePath) {
        try {
            // Verificar que el archivo existe
            if (!file_exists($certificatePath)) {
                throw new Exception("El archivo del certificado no existe: " . $certificatePath);
            }
            
            // Configurar destinatario
            $this->mailer->addAddress($participantData['email'], $participantData['name']);
            
            // Asunto
            $this->mailer->Subject = EmailConfig::EMAIL_SUBJECT;
            
            // Contenido HTML del email
            $this->mailer->isHTML(true);
            $this->mailer->Body = $this->getEmailTemplate($participantData);
            
            // Versión alternativa en texto plano
            $this->mailer->AltBody = $this->getEmailTextVersion($participantData);
            
            // Adjuntar certificado
            $this->mailer->addAttachment(
                $certificatePath, 
                'Certificado_' . str_replace(' ', '_', $participantData['name']) . '.pdf'
            );
            
            // Enviar
            $result = $this->mailer->send();
            
            error_log("Email enviado exitosamente a: " . $participantData['email']);
            
            return [
                'success' => true,
                'message' => 'Email enviado correctamente'
            ];
            
        } catch (Exception $e) {
            error_log("Error enviando email: " . $this->mailer->ErrorInfo);
            
            return [
                'success' => false,
                'error' => $this->mailer->ErrorInfo
            ];
        } finally {
            // Limpiar destinatarios y adjuntos para el próximo envío
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();
        }
    }
    
    /**
     * Plantilla HTML del email
     */
    private function getEmailTemplate($participantData) {
        $html = '
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }
                .content {
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }
                .certificate-icon {
                    font-size: 50px;
                    margin-bottom: 10px;
                }
                .highlight {
                    background: #fff;
                    padding: 15px;
                    border-left: 4px solid #667eea;
                    margin: 20px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #eee;
                    color: #666;
                    font-size: 12px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 30px;
                    background: #667eea;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="certificate-icon">🎓</div>
                <h1>¡Felicidades!</h1>
                <p>Estimado Docente !!</p>
            </div>
            
            <div class="content">
                <h2>Estimado/a ' . htmlspecialchars($participantData['name']) . ',</h2>
                
                <p>Es un placer informarte que has completado exitosamente el curso:</p>
                
                <div class="highlight">
                    <strong>📚 Curso:</strong> ' . htmlspecialchars($participantData['course']) . '<br>
                    <strong>📅 Fecha de finalización:</strong> ' . date('d/m/Y', strtotime($participantData['date_completed'])) . '
                </div>
                
                <p>Adjunto a este correo encontrarás tu <strong>Certificado de Participación</strong> en formato PDF.</p>
                
                <p>Este certificado valida tu participación y aprovechamiento en el programa educativo del Instituto Vida Nueva.</p>
                
                <p><strong>¿Qué hacer con tu certificado?</strong></p>
                <ul>
                    <li>📥 Descárgalo y guárdalo en un lugar seguro</li>
                    <li>🖨️ O si quieres Imprímelo y guardalo</li>
                    
                </ul>
                
                <p>¡Felicidades por tu logro! Continúa aprendiendo y creciendo con nosotros.</p>
                
                <div class="footer">
                    <p><strong>Instituto Vida Nueva</strong></p>
                    <p>Este es un correo automático, por favor no responder.</p>
                    <p>Para consultas, contacta a: biblioteca.campusnorte@istvidanueva.edu.ec</p>
                    <p>&copy; ' . date('Y') . ' Instituto Vida Nueva. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>';
        
        return $html;
    }
    
    /**
     * Versión en texto plano del email
     */
    private function getEmailTextVersion($participantData) {
        return "
Felicidades " . $participantData['name'] . "!

Has completado exitosamente el curso: " . $participantData['course'] . "
Fecha de finalización: " . date('d/m/Y', strtotime($participantData['date_completed'])) . "

Adjunto encontrarás tu Certificado de Participación en formato PDF.

--
Instituto Vida Nueva
Este es un correo automático, por favor no responder.
© " . date('Y') . " Instituto Vida Nueva
        ";
    }
    
    /**
     * Enviar certificados en lote
     */
    public function sendBatchCertificates($participants, $certificatesPath) {
        $results = [
            'sent' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        foreach ($participants as $participant) {
            // Construir ruta del certificado
            $certificateFile = $certificatesPath . '/' . $participant['certificate_filename'];
            
            $result = $this->sendCertificate($participant, $certificateFile);
            
            if ($result['success']) {
                $results['sent']++;
            } else {
                $results['failed']++;
                $results['errors'][] = "Error enviando a {$participant['email']}: {$result['error']}";
            }
            
            // Pequeña pausa entre envíos para no saturar el servidor
            usleep(500000); // 0.5 segundos
        }
        
        return $results;
    }
    
    /**
     * Probar configuración de email
     */
    public function testConnection() {
        try {
            $this->mailer->smtpConnect();
            $this->mailer->smtpClose();
            
            return [
                'success' => true,
                'message' => 'Conexión SMTP exitosa'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $this->mailer->ErrorInfo
            ];
        }
    }
}