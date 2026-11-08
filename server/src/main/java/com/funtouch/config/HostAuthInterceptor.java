package com.funtouch.config;

import com.funtouch.exception.UnauthorizedException;
import com.funtouch.service.RoomService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Interceptor that validates the {@code X-Host-Token} header on host-only endpoints.
 *
 * <p>Applied to: POST /api/rooms/{id}/approve, /reject, /control, DELETE /api/rooms/{id}
 *
 * <p>The token is a UUID issued at room creation and stored in the Room object.
 * It never appears in GET responses; only the room creator receives it.
 */
@Component
public class HostAuthInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(HostAuthInterceptor.class);
    public static final String HOST_TOKEN_HEADER = "X-Host-Token";

    private final RoomService roomService;

    public HostAuthInterceptor(RoomService roomService) {
        this.roomService = roomService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {

        String method = request.getMethod();
        // GET and OPTIONS are always public
        if ("GET".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }

        String path = request.getRequestURI();
        String roomId = extractRoomId(path);

        if (roomId == null) {
            // Not a room-scoped request; let it through
            return true;
        }

        String token = request.getHeader(HOST_TOKEN_HEADER);
        if (token == null || token.isBlank()) {
            log.warn("Missing {} header for path {}", HOST_TOKEN_HEADER, path);
            throw new UnauthorizedException("Missing " + HOST_TOKEN_HEADER + " header");
        }

        roomService.validateHostToken(roomId, token);
        log.debug("Host token validated for room {}", roomId);
        return true;
    }

    /**
     * Extracts the roomId from paths like /api/rooms/{id}/approve.
     * Returns null for paths that don't have a room segment.
     */
    private String extractRoomId(String path) {
        // e.g. /api/rooms/abc123/approve → "abc123"
        String[] parts = path.split("/");
        for (int i = 0; i < parts.length - 1; i++) {
            if ("rooms".equals(parts[i]) && i + 1 < parts.length) {
                return parts[i + 1];
            }
        }
        return null;
    }
}
