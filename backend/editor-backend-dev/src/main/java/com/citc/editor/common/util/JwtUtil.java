package com.citc.editor.common.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.Claim;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.citc.editor.common.config.security.CustomUserDetails;
import org.springframework.stereotype.Component;

import java.util.Calendar;
import java.util.Date;

@Component
public class JwtUtil {
    private static final String keyId = "3e79646c4dbc408383a9eed09f2b85ae";

    /**
     * token过期时间（分钟）
     */
    public static final int expirationTime = 8 * 60;

    public static String createToken(String id, String username) {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.MINUTE, expirationTime);
        return JWT.create()
                .withClaim("id", id)
                .withClaim("username", username)
                .withExpiresAt(cal.getTime())
                .sign(Algorithm.HMAC256(keyId));
    }

    public static boolean verifyToken(String token) {
        try {
            decodeToken(token);
            return true;
        } catch (JWTVerificationException e) {
            return false;
        }
    }

    public static String getUsername(String token) {
        DecodedJWT decodedJWT = decodeToken(token);
        Claim usernameClaim = decodedJWT.getClaim("username");
        return usernameClaim.asString();
    }

    public static CustomUserDetails getCustomUserDetails(String token) {
        DecodedJWT decodedJWT = decodeToken(token);
        return new CustomUserDetails(decodedJWT.getClaim("username").asString(),
                decodedJWT.getClaim("id").asString());
    }

    private static DecodedJWT decodeToken(String token) {
        JWTVerifier jwtVerifier = JWT.require(Algorithm.HMAC256(keyId)).build();
        return jwtVerifier.verify(token);
    }

    public Date getExpirationDateFromToken(String token) {
        return decodeToken(token).getExpiresAt();
    }
}
