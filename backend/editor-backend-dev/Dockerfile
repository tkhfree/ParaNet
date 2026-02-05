FROM citc/java:8
VOLUME /tmp
WORKDIR /ROOT
ADD target/*.jar app.jar
ENTRYPOINT [ "sh", "-c", "java -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-dev} -Djava.security.egd=file:/dev/./urandom -jar ./app.jar" ]
