// Sistema de Certificados - JavaScript Principal

$(document).ready(function() {
    // Inicializar componentes
    initializeUpload();
    initializeDataTable();
    initializeStats();
    initializeEventHandlers();
});

// Upload de archivos CSV
function initializeUpload() {
    $('#uploadForm').on('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const submitBtn = $(this).find('button[type="submit"]');
        const originalText = submitBtn.html();
        
        // UI Loading state
        submitBtn.html('<span class="spinner-border spinner-border-sm" role="status"></span> Procesando...');
        submitBtn.prop('disabled', true);
        $('#uploadResults').hide();
        
        $.ajax({
            url: 'index.php?action=upload-csv',
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response) {
                handleUploadResponse(response);
            },
            error: function(xhr, status, error) {
                console.log('Error details:', xhr.responseText);
                showAlert('Error al procesar el archivo: ' + error, 'danger');
            },
            complete: function() {
                // Restaurar botón
                submitBtn.html(originalText);
                submitBtn.prop('disabled', false);
            }
        });
    });
}

function handleUploadResponse(response) {
    const resultsDiv = $('#uploadResults');
    const alertDiv = $('#resultAlert');
    const errorsDiv = $('#errorsList');
    
    if (response.success) {
        alertDiv.removeClass('alert-danger').addClass('alert-success');
        alertDiv.html('<i class="fas fa-check-circle"></i> ' + response.message);
        
        // Mostrar errores si los hay
        if (response.errors && response.errors.length > 0) {
            let errorsList = '<div class="alert alert-warning mt-2"><h6>Errores encontrados:</h6><ul class="mb-0">';
            response.errors.forEach(error => {
                errorsList += '<li>' + error + '</li>';
            });
            errorsList += '</ul></div>';
            errorsDiv.html(errorsList);
        } else {
            errorsDiv.html('');
        }
        
        // Actualizar estadísticas
        updateStats();
        
        // Recargar tabla si existe y está inicializada
        if ($('#participantsTable').length && typeof $.fn.DataTable !== 'undefined' && $.fn.DataTable.isDataTable('#participantsTable')) {
            $('#participantsTable').DataTable().ajax.reload();
        }
        
        // Limpiar formulario
        $('#uploadForm')[0].reset();
        
    } else {
        alertDiv.removeClass('alert-success').addClass('alert-danger');
        alertDiv.html('<i class="fas fa-exclamation-circle"></i> ' + response.message);
        errorsDiv.html('');
    }
    
    resultsDiv.show().addClass('fade-in');
}

// DataTable para participantes
function initializeDataTable() {
    if ($('#participantsTable').length && typeof $.fn.DataTable !== 'undefined') {
        const table = $('#participantsTable').DataTable({
            ajax: {
                url: 'index.php?action=get-participants',
                type: 'GET',
                error: function(xhr, error, code) {
                    console.log('Error loading participants:', xhr.responseText);
                    alert('Error al cargar participantes. Revisa la consola para más detalles.');
                }
            },
            columns: [
                { 
                    data: null,
                    orderable: false,
                    render: function(data, type, row) {
                        return '<input type="checkbox" class="form-check-input participant-checkbox" value="' + row[0] + '">';
                    }
                },
                { data: 0 }, // ID
                { data: 1 }, // Nombre
                { data: 2 }, // Email
                { data: 3 }, // Curso
                { data: 4 }, // Fecha
                { 
                    data: 5, // Acciones
                    orderable: false
                }
            ],
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json',
                emptyTable: "No hay participantes registrados",
                info: "Mostrando _START_ a _END_ de _TOTAL_ participantes",
                infoEmpty: "Mostrando 0 a 0 de 0 participantes",
                infoFiltered: "(filtrado de _MAX_ participantes totales)",
                lengthMenu: "Mostrar _MENU_ participantes",
                loadingRecords: "Cargando...",
                processing: "Procesando...",
                search: "Buscar:",
                zeroRecords: "No se encontraron participantes"
            },
            pageLength: 25,
            responsive: true,
            order: [[1, 'desc']], // Ordenar por ID descendente
            processing: true
        });
        
        // Manejar selección de todos
        $('#selectAll').on('change', function() {
            $('.participant-checkbox').prop('checked', this.checked);
            updateGenerateButton();
        });
        
        // Manejar selección individual
        $('#participantsTable').on('change', '.participant-checkbox', function() {
            updateGenerateButton();
            
            // Actualizar estado del "Seleccionar todos"
            const total = $('.participant-checkbox').length;
            const checked = $('.participant-checkbox:checked').length;
            $('#selectAll').prop('indeterminate', checked > 0 && checked < total);
            $('#selectAll').prop('checked', checked === total);
        });
        
        // Manejar generación de certificados individuales
        $('#participantsTable').on('click', '.generate-cert', function() {
            const participantId = $(this).data('id');
            generateCertificate(participantId);
        });
        
        // Manejar envío de email individual
        $('#participantsTable').on('click', '.send-email-cert', function() {
            const participantId = $(this).data('id');
            const email = $(this).data('email');
            
            if (!confirm('¿Enviar certificado a ' + email + '?')) {
                return;
            }
            
            const btn = $(this);
            const originalHtml = btn.html();
            
            btn.html('<span class="spinner-border spinner-border-sm"></span>').prop('disabled', true);
            
            $.ajax({
                url: 'index.php?action=send-email',
                type: 'POST',
                data: { participant_id: participantId },
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        alert('✅ ' + response.message);
                    } else {
                        alert('❌ ' + response.message);
                    }
                },
                error: function(xhr) {
                    console.error('Error details:', xhr.responseText);
                    alert('❌ Error al enviar el email. Verifica la configuración.');
                },
                complete: function() {
                    btn.html(originalHtml).prop('disabled', false);
                }
            });
        });
    }
}

// Actualizar botón de generar seleccionados
function updateGenerateButton() {
    const selectedCount = $('.participant-checkbox:checked').length;
    const btn = $('#generateSelectedBtn');
    
    if (selectedCount > 0) {
        btn.prop('disabled', false);
        btn.html('<i class="bi bi-award"></i>Generar (' + selectedCount + ')');
        
        // Mostrar también el botón de enviar emails si hay seleccionados con certificados
        updateEmailButton();
    } else {
        btn.prop('disabled', true);
        btn.html('<i class="bi bi-award-fill"></i>Generar Seleccionados');
        
        // Ocultar botón de enviar emails si no hay selección
        $('#sendSelectedEmailsBtn').remove();
    }
}

// Actualizar botón de enviar emails seleccionados
function updateEmailButton() {
    const selectedIds = $('.participant-checkbox:checked').map(function() {
        return $(this).val();
    }).get();
    
    if (selectedIds.length === 0) {
        $('#sendSelectedEmailsBtn').remove();
        return;
    }
    
    // Verificar cuántos de los seleccionados tienen certificado generado
    let withCertificates = 0;
    $('.participant-checkbox:checked').each(function() {
        const row = $(this).closest('tr');
        if (row.find('.badge-success, .bg-success').length > 0) {
            withCertificates++;
        }
    });
    
    if (withCertificates > 0) {
        if ($('#sendSelectedEmailsBtn').length === 0) {
            const btn = `<button class="btn btn-info btn-sm" id="sendSelectedEmailsBtn" title="Enviar certificados por email">
                           <i class="bi bi-envelope-arrow-up-fill"></i> Enviar Emails (${withCertificates})
                         </button>`;
            $('#generateSelectedBtn').after(' ' + btn);
            
            $('#sendSelectedEmailsBtn').on('click', function() {
                sendSelectedEmails();
            });
        } else {
            $('#sendSelectedEmailsBtn').html(`<i class="bi bi-envelope-arrow-up-fill"></i> Enviar Emails (${withCertificates})`);
        }
    } else {
        $('#sendSelectedEmailsBtn').remove();
    }
}

// Event handlers
function initializeEventHandlers() {
    // Generar certificados seleccionados
    $('#generateSelectedBtn').on('click', function() {
        const selectedIds = $('.participant-checkbox:checked').map(function() {
            return $(this).val();
        }).get();
        
        if (selectedIds.length > 0) {
            generateBatchCertificates(selectedIds);
        }
    });
    
    // Botón de descarga masiva
    $('#massDownloadBtn').on('click', function() {
        downloadAllGeneratedCertificates();
    });
}

// Enviar emails de certificados seleccionados
function sendSelectedEmails() {
    const selectedIds = [];
    
    // Obtener solo los IDs que tienen certificado generado
    $('.participant-checkbox:checked').each(function() {
        const row = $(this).closest('tr');
        if (row.find('.badge-success, .bg-success').length > 0) {
            selectedIds.push($(this).val());
        }
    });
    
    if (selectedIds.length === 0) {
        alert('⚠️ Los participantes seleccionados no tienen certificados generados.\nPrimero genera los certificados.');
        return;
    }
    
    if (!confirm(`¿Enviar certificados por email a ${selectedIds.length} participantes?\n\nAsegúrate de que los emails sean correctos.`)) {
        return;
    }
    
    // Mostrar progreso
   const progressHtml = `
        <div id="emailProgress" class="alert alert-info mt-3">
            <strong><i class="fas fa-spinner fa-spin"></i> Enviando emails...</strong>
            <div class="progress mt-2">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" style="width: 0%">0%</div>
            </div>
            <small class="mt-2 d-block">Esto puede tomar unos minutos. Por favor espera...</small>
        </div>`; 
    
    $('.card-header').after(progressHtml);
    $('#sendSelectedEmailsBtn').prop('disabled', true);
    $('#generateSelectedBtn').prop('disabled', true);
    
    $.ajax({
        url: 'index.php?action=send-batch-emails',
        type: 'POST',
        data: { participant_ids: selectedIds },
        dataType: 'json',
        success: function(response) {
            $('#emailProgress').remove();
            
            if (response.success) {
                let message = '✅ ' + response.message;
                
                if (response.emails && response.emails.length > 0) {
                    message += '\n\n📧 Emails enviados a:\n';
                    response.emails.slice(0, 5).forEach(email => {
                        message += '- ' + email.name + ' (' + email.email + ')\n';
                    });
                    if (response.emails.length > 5) {
                        message += '... y ' + (response.emails.length - 5) + ' más';
                    }
                }
                
                if (response.errors && response.errors.length > 0) {
                    message += '\n\n⚠️ Errores:\n' + response.errors.slice(0, 3).join('\n');
                    if (response.errors.length > 3) {
                        message += '\n... y ' + (response.errors.length - 3) + ' más.';
                    }
                }
                
                alert(message);
                
                // Limpiar selección
                $('.participant-checkbox').prop('checked', false);
                $('#selectAll').prop('checked', false);
                updateGenerateButton();
                
            } else {
                alert('❌ Error: ' + response.message);
            }
        },
        error: function(xhr) {
            $('#emailProgress').remove();
            console.error('Error details:', xhr.responseText);
            alert('❌ Error al enviar los emails.\n\nVerifica:\n- Configuración de email correcta\n- Conexión a internet\n- Límite de envío de Gmail');
        },
        complete: function() {
            $('#sendSelectedEmailsBtn').prop('disabled', false);
            $('#generateSelectedBtn').prop('disabled', false);
        }
    });
}

// Generar certificado individual
function generateCertificate(participantId) {
    if (confirm('¿Generar certificado para este participante?')) {
        $.ajax({
            url: 'index.php?action=generate-certificate',
            type: 'POST',
            data: { participant_id: participantId },
            dataType: 'json',
            beforeSend: function() {
                // Mostrar loading
                $('.generate-cert[data-id="' + participantId + '"]')
                    .html('<span class="spinner-border spinner-border-sm"></span>')
                    .prop('disabled', true);
            },
            success: function(response) {
                if (response.success) {
                    alert('Certificado generado exitosamente');
                    
                    // Recargar tabla
                    if ($.fn.DataTable.isDataTable('#participantsTable')) {
                        $('#participantsTable').DataTable().ajax.reload();
                    }
                    updateStats();
                    checkMassDownloadButton();
                } else {
                    alert('Error: ' + response.message);
                }
            },
            error: function() {
                alert('Error al generar el certificado');
            }
        });
    }
}

// Generar certificados en lote
function generateBatchCertificates(participantIds) {
    if (!confirm(`¿Generar ${participantIds.length} certificados?`)) {
        return;
    }
    
    // Mostrar progreso
    const progressHtml = `
        <div id="batchProgress" class="alert alert-info">
            <strong>Generando certificados...</strong>
            <div class="progress mt-2">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" style="width: 0%">0%</div>
            </div>
        </div>`; 
    
    $('#generateSelectedBtn').before(progressHtml);
    $('#generateSelectedBtn').prop('disabled', true);
    
    $.ajax({
        url: 'index.php?action=generate-batch',
        type: 'POST',
        data: { participant_ids: participantIds },
        dataType: 'json',
        success: function(response) {
            $('#batchProgress').remove();
            
            if (response.success) {
                let message = response.message;
                
                if (response.errors && response.errors.length > 0) {
                    message += '\n\nErrores encontrados:\n' + response.errors.slice(0, 3).join('\n');
                    if (response.errors.length > 3) {
                        message += '\n... y ' + (response.errors.length - 3) + ' más.';
                    }
                }
                
                alert(message);
                
                // Limpiar selección
                $('.participant-checkbox').prop('checked', false);
                $('#selectAll').prop('checked', false);
                updateGenerateButton();
                
                // Recargar tabla y estadísticas
                if ($.fn.DataTable.isDataTable('#participantsTable')) {
                    $('#participantsTable').DataTable().ajax.reload();
                }
                updateStats();
                checkMassDownloadButton();
                
            } else {
                alert('Error: ' + response.message);
            }
        },
        error: function(xhr) {
            $('#batchProgress').remove();
            console.error('Error details:', xhr.responseText);
            alert('Error al generar los certificados. Revisa la consola.');
        },
        complete: function() {
            $('#generateSelectedBtn').prop('disabled', false);
        }
    });
}

// Función para descargar certificado individual
function downloadCertificate(filename) {
    if (!filename) {
        alert('No se especificó el archivo a descargar');
        return;
    }
    
    // Crear un iframe oculto para la descarga
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'index.php?action=download&file=' + encodeURIComponent(filename);
    document.body.appendChild(iframe);
    
    // Remover el iframe después de 5 segundos
    setTimeout(function() {
        document.body.removeChild(iframe);
    }, 5000);
}

// Descargar todos los certificados generados
function downloadAllGeneratedCertificates() {
    $.ajax({
        url: 'index.php?action=count-generated-certificates',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.count > 0) {
                if (confirm(`Se descargarán ${response.count} certificados en un archivo ZIP. ¿Continuar?`)) {
                    // Mostrar mensaje de preparación
                    const loadingHtml = `
                        <div id="zipLoading" class="alert alert-info mt-3">
                            <i class="fas fa-spinner fa-spin"></i> Preparando archivo ZIP...
                        </div>`;
                    $('#massDownloadBtn').after(loadingHtml);
                    
                    // Redirigir a la descarga del ZIP
                    window.location.href = 'index.php?action=download-all-zip';
                    
                    // Remover mensaje después de 3 segundos
                    setTimeout(function() {
                        $('#zipLoading').fadeOut(function() {
                            $(this).remove();
                        });
                    }, 3000);
                }
            } else {
                alert('No hay certificados generados para descargar');
            }
        },
        error: function() {
            alert('Error al verificar certificados disponibles');
        }
    });
}

// Descargar múltiples certificados con delay (YA NO SE USA)
function downloadMultipleCertificates(files) {
    // Esta función ya no es necesaria con el ZIP
    // Se mantiene por compatibilidad pero no se llama
}

// Verificar si mostrar el botón de descarga masiva
function checkMassDownloadButton() {
    $.ajax({
        url: 'index.php?action=count-generated-certificates',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.count > 0) {
                // Botón de descarga ZIP (FIJO)
                if ($('#massDownloadBtn').length === 0) {
                    const btnDownload = `<button class="btn btn-primary btn-sm" id="massDownloadBtn" title="Descargar todos los certificados en un archivo ZIP">
                                  <i class="bi bi-file-earmark-arrow-down-fill"></i> Descargar ZIP (${response.count})
                                 </button>`;
                    $('#generateSelectedBtn').after(' ' + btnDownload);
                    
                    // Reenlazar evento
                    $('#massDownloadBtn').on('click', function() {
                        downloadAllGeneratedCertificates();
                    });
                } else {
                    $('#massDownloadBtn').html(`<i class="fas fa-file-archive"></i> Descargar ZIP (${response.count})`);
                }
            } else {
                $('#massDownloadBtn').remove();
            }
        }
    });
}

// Generar todos los certificados
function generateAllCertificates() {
    alert('Esta funcionalidad se puede agregar fácilmente al sistema si la necesitas');
}

// Actualizar estadísticas
function updateStats() {
    $.ajax({
        url: 'index.php?action=get-participants',
        type: 'GET',
        success: function(response) {
            if (response && response.data) {
                const total = response.data.length;
                const withCertificates = response.data.filter(item => 
                    item[5] && item[5].includes('badge-success')).length;
                
                $('#totalParticipants').text(total);
                $('#totalCertificates').text(withCertificates);
            }
        },
        error: function() {
            console.log('Error al actualizar estadísticas');
        }
    });
}

// Inicializar estadísticas y verificar descarga masiva
function initializeStats() {
    if ($('#totalParticipants').length) {
        updateStats();
    }
    
    if ($('#generateSelectedBtn').length) {
        checkMassDownloadButton();
    }
}

// Función auxiliar para mostrar alertas
function showAlert(message, type) {
    const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
    
    $('#uploadResults').html(alertHtml).show();
}

// Probar configuración de email
function testEmailConfiguration() {
    $.ajax({
        url: 'index.php?action=test-email',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                alert('✅ Configuración correcta!\n' + response.message);
            } else {
                alert('❌ Error en la configuración:\n' + response.error);
            }
        },
        error: function() {
            alert('❌ Error al probar la configuración');
        }
    });
}